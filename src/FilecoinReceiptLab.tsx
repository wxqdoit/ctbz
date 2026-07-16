import { useEffect, useMemo, useRef, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { ArrowLeft, CheckCircle2, Copy, Database, ExternalLink, FileJson, Loader2, RefreshCw, UploadCloud, Wallet } from "lucide-react";
import { Synapse, calibration } from "@filoz/synapse-sdk";
import { custom } from "viem";
import { getWalletClient } from "wagmi/actions";
import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  FILECOIN_AUTO_UPLOAD_STORAGE_KEY,
  FILECOIN_RECEIPT_STORAGE_KEY,
  FILECOIN_RECEIPT_ADAPTER_MANIFEST,
  FILECOIN_RECEIPT_ADAPTER_SOURCE,
  buildDemoAssessmentReceipt,
  readAssessmentReceiptDraft,
  saveAssessmentReceiptDraft,
  serializeAssessmentReceipt,
  type AssessmentReceipt,
} from "@/lib/filecoinReceipt";
import { FILECOIN_CALIBRATION_CHAIN_ID, wagmiAdapter } from "@/lib/reownAppKit";
import { cn } from "@/lib/utils";

type UploadStage = "idle" | "switching" | "creating" | "preparing" | "funding" | "uploading" | "done" | "error";

type StoredCopy = {
  providerId: string;
  dataSetId: string;
  pieceId: string;
  role: string;
  retrievalUrl: string;
  isNewDataSet: boolean;
};

type StoredUploadResult = {
  pieceCid: string;
  size: number;
  requestedCopies: number;
  complete: boolean;
  fundingHash: string | null;
  copies: StoredCopy[];
  failedAttempts: {
    providerId: string;
    role: string;
    error: string;
    explicit: boolean;
  }[];
};

const RECEIPT_METADATA = {
  app: "ctbz",
  kind: "assessment-receipt",
  schema: "ctbz.assessment.receipt",
};

export default function FilecoinReceiptLab({ onBack }: { onBack: () => void }) {
  return <FilecoinReceiptLabInner onBack={onBack} />;
}

function ManifestItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

function FilecoinReceiptLabInner({ onBack }: { onBack: () => void }) {
  const [receipt, setReceipt] = useState<AssessmentReceipt | null>(() => readAssessmentReceiptDraft());
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [fundingHash, setFundingHash] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<StoredUploadResult | null>(null);
  const [copied, setCopied] = useState(false);
  const autoUploadStartedRef = useRef(false);
  const { open } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const receiptJson = useMemo(() => (receipt ? serializeAssessmentReceipt(receipt) : ""), [receipt]);
  const receiptBytes = useMemo(() => new TextEncoder().encode(receiptJson), [receiptJson]);
  const isRunning = stage === "switching" || stage === "creating" || stage === "preparing" || stage === "funding" || stage === "uploading";
  const isOnFilecoinCalibration = chainId === FILECOIN_CALIBRATION_CHAIN_ID;

  useEffect(() => {
    if (
      autoUploadStartedRef.current ||
      !receipt ||
      uploadResult ||
      isRunning ||
      stage !== "idle" ||
      window.sessionStorage.getItem(FILECOIN_AUTO_UPLOAD_STORAGE_KEY) !== "1"
    ) {
      return;
    }

    autoUploadStartedRef.current = true;
    window.sessionStorage.removeItem(FILECOIN_AUTO_UPLOAD_STORAGE_KEY);
    void uploadReceipt();
  }, [isRunning, receipt, stage, uploadResult]);

  function resetRunState() {
    setUploadResult(null);
    setErrorMessage("");
    setLogs([]);
    setUploadedBytes(0);
    setFundingHash(null);
    setStage("idle");
  }

  function reloadReceipt() {
    setReceipt(readAssessmentReceiptDraft());
    resetRunState();
  }

  function createDemoReceipt() {
    const demoReceipt = buildDemoAssessmentReceipt(window.location.origin);
    saveAssessmentReceiptDraft(demoReceipt);
    setReceipt(demoReceipt);
    resetRunState();
  }

  function appendLog(message: string) {
    setLogs((current) => [...current, `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} ${message}`]);
  }

  async function copyReceipt() {
    await navigator.clipboard.writeText(uploadResult ? JSON.stringify(uploadResult, null, 2) : receiptJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1300);
  }

  async function uploadReceipt() {
    if (!receipt) {
      setStage("error");
      setErrorMessage("当前没有可上传的检测收据，请先完成一次检测。");
      return;
    }

    if (!isConnected || !address) {
      setErrorMessage("请先连接 Reown 钱包。");
      await open();
      return;
    }

    setStage("switching");
    setErrorMessage("");
    setLogs([]);
    setUploadResult(null);
    setUploadedBytes(0);
    setFundingHash(null);
    appendLog("开始准备 Filecoin Calibration 上传");

    try {
      if (chainId !== FILECOIN_CALIBRATION_CHAIN_ID) {
        appendLog(`切换到 Filecoin Calibration，chainId ${FILECOIN_CALIBRATION_CHAIN_ID}`);
        await switchChainAsync({ chainId: FILECOIN_CALIBRATION_CHAIN_ID });
      }

      setStage("creating");
      appendLog("读取 Reown 钱包客户端");
      const walletClient = await getWalletClient(wagmiAdapter.wagmiConfig, {
        chainId: FILECOIN_CALIBRATION_CHAIN_ID,
      });
      if (!walletClient?.account) {
        throw new Error("Reown 钱包未返回账户。");
      }

      const synapse = Synapse.create({
        account: walletClient.account,
        chain: calibration,
        source: FILECOIN_RECEIPT_ADAPTER_SOURCE,
        transport: custom({ request: walletClient.transport.request }),
        withCDN: false,
      });

      appendLog("选择 Filecoin 存储服务商");
      const contexts = await synapse.storage.createContexts({
        callbacks: {
          onProviderSelected: (provider) => appendLog(`已选择 provider ${provider.id.toString()}`),
          onDataSetResolved: (info) => appendLog(`已解析 dataSet ${info.dataSetId.toString()}`),
        },
        copies: 1,
        metadata: RECEIPT_METADATA,
      });

      setStage("preparing");
      appendLog(`计算上传准备项，receipt 大小 ${formatBytes(receiptBytes.byteLength)}`);
      const preparation = await synapse.storage.prepare({
        context: contexts,
        dataSize: BigInt(receiptBytes.byteLength),
      });

      let paymentHash: string | null = null;
      if (preparation.transaction) {
        setStage("funding");
        appendLog("执行 USDFC 充值或授权交易");
        const payment = await preparation.transaction.execute({
          onHash: (hash) => {
            paymentHash = hash;
            setFundingHash(hash);
            appendLog(`链上交易已提交 ${shortHash(hash)}`);
          },
        });
        paymentHash = payment.hash;
        setFundingHash(payment.hash);
        appendLog(`准备交易完成 ${shortHash(payment.hash)}`);
      } else {
        appendLog("账户余额与授权已满足本次上传");
      }

      setStage("uploading");
      appendLog("上传 receipt JSON 到 Filecoin Onchain Cloud");
      const result = await synapse.storage.upload(receiptBytes, {
        callbacks: {
          onProgress: (bytes) => setUploadedBytes(bytes),
          onStored: (providerId, pieceCid) => appendLog(`provider ${providerId.toString()} 已存储 ${pieceCid.toString()}`),
          onPiecesAdded: (transaction, providerId) => appendLog(`provider ${providerId.toString()} 提交 pieces ${shortHash(transaction)}`),
          onPiecesConfirmed: (dataSetId, providerId) => appendLog(`provider ${providerId.toString()} 确认 dataSet ${dataSetId.toString()}`),
          onCopyComplete: (providerId, pieceCid) => appendLog(`provider ${providerId.toString()} 完成副本 ${pieceCid.toString()}`),
          onCopyFailed: (providerId, pieceCid, error) =>
            appendLog(`provider ${providerId.toString()} 副本失败 ${pieceCid.toString()}：${error.message}`),
        },
        contexts,
        pieceMetadata: {
          ...RECEIPT_METADATA,
          receiptId: receipt.receiptId,
        },
      });

      setUploadResult(toStoredUploadResult(result, paymentHash));
      setUploadedBytes(result.size);
      setStage("done");
      appendLog(`上传完成 ${result.pieceCid.toString()}`);
    } catch (error) {
      const message = getErrorMessage(error);
      setStage("error");
      setErrorMessage(message);
      appendLog(`上传失败：${message}`);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button type="button" variant="outline" size="icon" onClick={onBack} aria-label="返回检测结果" className="h-10 w-10 rounded-lg">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          <div>
            <p className="text-sm font-semibold text-primary">Filecoin Receipt Adapter</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal text-slate-950 dark:text-slate-50">检测结果上链存储</h1>
          </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => void open()} className="h-10 gap-2 rounded-lg">
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {isConnected && address ? shortAddress(address) : "连接钱包"}
            </Button>
            <Button type="button" variant="outline" onClick={reloadReceipt} className="h-10 gap-2 rounded-lg">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              重新读取
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <ManifestItem label="参赛轨道" value={FILECOIN_RECEIPT_ADAPTER_MANIFEST.challenge.track} />
          <ManifestItem label="Filecoin 原语" value={FILECOIN_RECEIPT_ADAPTER_MANIFEST.filecoin.primitive} />
          <ManifestItem label="Adapter 输出" value={FILECOIN_RECEIPT_ADAPTER_MANIFEST.adapter.output} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Receipt JSON</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span className="rounded-full border border-border px-3 py-1">{receipt ? receipt.receiptId : "未生成"}</span>
                <span className="rounded-full border border-border px-3 py-1">{formatBytes(receiptBytes.byteLength)}</span>
              </div>
            </div>

            {receipt ? (
              <pre className="mt-4 max-h-[62vh] overflow-auto rounded-lg border border-border bg-background p-4 text-xs leading-5 text-muted-foreground">
                {receiptJson}
              </pre>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-background p-6 text-sm leading-6 text-muted-foreground">
                <p>当前浏览器会话没有 `{FILECOIN_RECEIPT_STORAGE_KEY}`。</p>
                <Button type="button" variant="outline" onClick={createDemoReceipt} className="mt-4 h-10 gap-2 rounded-lg">
                  <FileJson className="h-4 w-4" aria-hidden="true" />
                  生成演示收据
                </Button>
              </div>
            )}
          </section>

          <aside className="flex min-w-0 flex-col gap-5">
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">上传控制</h2>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <StatusRow label="钱包" value={isConnected && address ? shortAddress(address) : "未连接"} active={Boolean(isConnected && address)} />
                <StatusRow
                  label="网络"
                  value={isOnFilecoinCalibration ? "Filecoin Calibration" : `chain ${chainId ?? "-"}`}
                  active={isOnFilecoinCalibration}
                />
                <StatusRow label="状态" value={stageLabel(stage)} active={stage === "done"} />
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: receiptBytes.byteLength > 0 ? `${Math.min(100, (uploadedBytes / receiptBytes.byteLength) * 100)}%` : "0%" }}
                />
              </div>

              <div className="mt-4 grid gap-2">
                <Button type="button" onClick={uploadReceipt} disabled={!receipt || isRunning} className="h-11 gap-2 rounded-lg">
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="h-4 w-4" aria-hidden="true" />}
                  用 Synapse 写入 Filecoin
                </Button>
                <Button type="button" variant="outline" onClick={copyReceipt} disabled={!receipt && !uploadResult} className="h-10 gap-2 rounded-lg">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {copied ? "已复制" : "复制 JSON"}
                </Button>
              </div>

              {errorMessage ? <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">{errorMessage}</p> : null}
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">存储结果</h2>
              </div>

              {uploadResult ? (
                <div className="mt-4 grid gap-3 text-sm">
                  <ResultLine label="PieceCID" value={uploadResult.pieceCid} />
                  <ResultLine label="大小" value={formatBytes(uploadResult.size)} />
                  <ResultLine label="完成" value={uploadResult.complete ? "是" : "否"} />
                  {fundingHash || uploadResult.fundingHash ? <ResultLine label="准备交易" value={fundingHash ?? uploadResult.fundingHash ?? ""} /> : null}
                  {uploadResult.copies.map((copy) => (
                    <a
                      key={`${copy.providerId}-${copy.pieceId}`}
                      href={copy.retrievalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 font-semibold text-primary transition-colors hover:bg-secondary"
                    >
                      <span className="min-w-0 truncate">provider {copy.providerId}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-muted-foreground">上传完成后显示 PieceCID、provider 与 retrieval URL。</p>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">执行日志</h2>
              <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 text-muted-foreground">
                {logs.length > 0 ? logs.map((log, index) => <p key={`${index}-${log}`}>{log}</p>) : <p>等待上传</p>}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusRow({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("min-w-0 truncate font-semibold", active ? "text-primary" : "text-slate-950 dark:text-slate-50")}>{value}</span>
    </div>
  );
}

function ResultLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}

function stageLabel(stage: UploadStage) {
  switch (stage) {
    case "switching":
      return "切换网络";
    case "creating":
      return "选择 provider";
    case "preparing":
      return "计算准备项";
    case "funding":
      return "等待签名";
    case "uploading":
      return "上传中";
    case "done":
      return "已完成";
    case "error":
      return "失败";
    default:
      return "待上传";
  }
}

function toStoredUploadResult(
  result: Awaited<ReturnType<InstanceType<typeof Synapse>["storage"]["upload"]>>,
  fundingHash: string | null,
): StoredUploadResult {
  return {
    complete: result.complete,
    copies: result.copies.map((copy) => ({
      dataSetId: copy.dataSetId.toString(),
      isNewDataSet: copy.isNewDataSet,
      pieceId: copy.pieceId.toString(),
      providerId: copy.providerId.toString(),
      retrievalUrl: copy.retrievalUrl,
      role: copy.role,
    })),
    failedAttempts: result.failedAttempts.map((attempt) => ({
      error: attempt.error,
      explicit: attempt.explicit,
      providerId: attempt.providerId.toString(),
      role: attempt.role,
    })),
    fundingHash,
    pieceCid: result.pieceCid.toString(),
    requestedCopies: result.requestedCopies,
    size: result.size,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}
