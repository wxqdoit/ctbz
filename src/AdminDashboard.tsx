import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Check,
  Code2,
  Database,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Play,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useDisconnect, useSwitchChain, useWalletClient } from "wagmi";
import { Button } from "@/components/ui/button";
import { allDimensions, type DimensionId, type OptionId } from "@/data/questions";
import {
  buildSampleAnswers,
  callMcpTool,
  callPaidMcpTool,
  createCurlExample,
  createPaidRetryCurlExample,
  isSamePaymentAddress,
  type McpToolName,
} from "@/lib/mcpPayments";
import { X_LAYER_CHAIN_ID } from "@/lib/reownAppKit";
import { cn } from "@/lib/utils";

const DEFAULT_API_BASE = "https://api.ctbz.lol";
const LEGACY_API_BASES = ["https://ctbz-a2mcp-worker.wxqdoit.workers.dev"];
const API_BASE_STORAGE_KEY = "ctbz_admin_api_base";
const ADMIN_TOKEN_STORAGE_KEY = "ctbz_admin_token";

const PROVIDER_OPTIONS = [
  { value: "openai-compatible", label: "OpenAI 兼容" },
  { value: "openai", label: "OpenAI" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "custom", label: "自定义" },
];

type ToolConfig = {
  name: string;
  enabled: boolean;
  paid: boolean;
  price: string;
  priceLabel: string;
  scheme: string;
  network: string;
  payTo: string;
  updatedAt: string;
};

type CallLog = {
  id: string;
  toolName: string;
  paid: boolean;
  status: string;
  httpStatus: number;
  price: string | null;
  network: string | null;
  payTo: string | null;
  error: string | null;
  createdAt: string;
};

type AiProvider = {
  id: string;
  provider: string;
  name: string;
  baseUrl: string;
  model: string;
  status: "active" | "inactive";
  note: string;
  sortOrder: number;
  apiKeySet: boolean;
  apiKeyPreview: string;
  createdAt: string;
  updatedAt: string;
};

type QuestionOptionAdmin = {
  id: OptionId;
  label: string;
  score: number;
};

type QuestionAdminItem = {
  id: string;
  category: string;
  text: string;
  attribute: string;
  dimension: DimensionId;
  enabled: boolean;
  sortOrder: number;
  options: QuestionOptionAdmin[];
  createdAt: string;
  updatedAt: string;
};

type AdminConfigResponse = {
  freeTools: string[];
  managedTools: ToolConfig[];
};

type CallsResponse = {
  calls: CallLog[];
  limit: number;
};

type AiProvidersResponse = {
  providers: AiProvider[];
};

type QuestionsResponse = {
  questions: QuestionAdminItem[];
  limit: number;
};

type ModelsResponse = {
  models: string[];
  firstModel: string | null;
};

type DraftToolConfig = Pick<
  ToolConfig,
  "enabled" | "paid" | "price" | "scheme" | "network" | "payTo"
>;

type ProviderDraft = {
  provider: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  status: "active" | "inactive";
  note: string;
  sortOrder: string;
};

type QuestionDraft = {
  category: string;
  text: string;
  dimension: DimensionId;
  enabled: boolean;
  sortOrder: string;
  options: Array<{
    id: OptionId;
    label: string;
    score: string;
  }>;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type TestRunState = "idle" | "running" | "ready" | "error";

type TestResult = {
  title: string;
  status: TestRunState;
  data: unknown;
};

function AdminDashboardInner() {
  const [apiBase, setApiBase] = useState(getInitialApiBase);
  const [token, setToken] = useState(() => getStoredValue(ADMIN_TOKEN_STORAGE_KEY, ""));
  const [authenticated, setAuthenticated] = useState(() => getStoredValue(ADMIN_TOKEN_STORAGE_KEY, "").trim().length > 0);
  const [showToken, setShowToken] = useState(false);
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftToolConfig>>({});
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [freeTools, setFreeTools] = useState<string[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [providerDraft, setProviderDraft] = useState(defaultProviderDraft);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerModels, setProviderModels] = useState<string[]>([]);
  const [providerModelMessage, setProviderModelMessage] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [questions, setQuestions] = useState<QuestionAdminItem[]>([]);
  const [questionDraft, setQuestionDraft] = useState(defaultQuestionDraft);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [status, setStatus] = useState<LoadState>("idle");
  const [message, setMessage] = useState("未连接");
  const [savingTool, setSavingTool] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult>({
    title: "等待测试",
    status: "idle",
    data: null,
  });
  const modelFetchKeyRef = useRef("");
  const { open } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  const normalizedApiBase = useMemo(() => normalizeApiBase(apiBase), [apiBase]);
  const hasToken = token.trim().length > 0;

  useEffect(() => {
    window.localStorage.setItem(API_BASE_STORAGE_KEY, apiBase);
  }, [apiBase]);

  useEffect(() => {
    window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  }, [token]);

  useEffect(() => {
    const baseUrl = providerDraft.baseUrl.trim();
    const apiKey = providerDraft.apiKey.trim();
    if (!hasToken || !baseUrl || !apiKey || !baseUrl.replace(/\/+$/, "").endsWith("/v1")) {
      return;
    }

    const fetchKey = `${normalizedApiBase}|${baseUrl}|${apiKey}`;
    if (modelFetchKeyRef.current === fetchKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      modelFetchKeyRef.current = fetchKey;
      void fetchModels(false);
    }, 800);

    return () => window.clearTimeout(timer);
  }, [hasToken, normalizedApiBase, providerDraft.apiKey, providerDraft.baseUrl, token]);

  async function refreshAll(markAuthenticated = false) {
    if (!hasToken) {
      setStatus("error");
      setMessage("请填写 ADMIN_TOKEN");
      return;
    }

    setStatus("loading");
    setMessage("加载中");

    try {
      const [config, logs, providerList, questionList] = await Promise.all([
        requestAdmin<AdminConfigResponse>(normalizedApiBase, token, "/admin/config"),
        requestAdmin<CallsResponse>(normalizedApiBase, token, "/admin/calls?limit=50"),
        requestAdmin<AiProvidersResponse>(normalizedApiBase, token, "/admin/ai-providers"),
        requestAdmin<QuestionsResponse>(normalizedApiBase, token, "/admin/questions?limit=250"),
      ]);
      setFreeTools(config.freeTools);
      setTools(config.managedTools);
      setDrafts(Object.fromEntries(config.managedTools.map((tool) => [tool.name, toDraft(tool)])));
      setCalls(logs.calls);
      setProviders(providerList.providers);
      setQuestions(questionList.questions);
      if (markAuthenticated) {
        setAuthenticated(true);
      }
      setStatus("ready");
      setMessage("已连接");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "请求失败");
    }
  }

  async function login() {
    await refreshAll(true);
  }

  function logout() {
    setAuthenticated(false);
    setToken("");
    setTools([]);
    setDrafts({});
    setCalls([]);
    setFreeTools([]);
    setProviders([]);
    setQuestions([]);
    setStatus("idle");
    setMessage("未连接");
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }

  async function runMetaTest() {
    setTestResult({ title: "元数据测试", status: "running", data: "请求中" });
    try {
      const data = await callMcpTool(normalizedApiBase, "ctbz_assessment_meta");
      setTestResult({ title: "元数据测试", status: "ready", data });
    } catch (error) {
      setTestResult({
        title: "元数据测试",
        status: "error",
        data: error instanceof Error ? error.message : "请求失败",
      });
    }
  }

  async function runPaidToolTest(toolName: Extract<McpToolName, "ctbz_draw_questions" | "ctbz_score_assessment">) {
    setTestResult({ title: toolName, status: "running", data: "等待钱包签名与支付请求" });
    try {
      const activeTool = tools.find((tool) => tool.name === toolName);
      if (!activeTool) {
        throw new Error("支付配置未加载，请先刷新后台");
      }

      if (!isConnected) {
        await open({ view: "Connect" });
        setTestResult({ title: toolName, status: "idle", data: "钱包连接后再次点击测试按钮" });
        return;
      }

      if (isSamePaymentAddress(address, activeTool.payTo)) {
        setTestResult({
          title: toolName,
          status: "error",
          data: {
            error: "当前连接的是收款地址，请切换到付款钱包后再测试",
            connectedWallet: address,
            payTo: activeTool.payTo,
            price: activeTool.priceLabel,
          },
        });
        return;
      }

      if (chainId !== X_LAYER_CHAIN_ID) {
        await switchChainAsync({ chainId: X_LAYER_CHAIN_ID });
      }

      if (!walletClient) {
        throw new Error("钱包客户端未就绪");
      }

      const args =
        toolName === "ctbz_score_assessment"
          ? { answers: buildSampleAnswers(getSampleQuestionIds(questions)) }
          : {};
      const data = await callPaidMcpTool(normalizedApiBase, toolName, args, walletClient);
      setTestResult({ title: toolName, status: "ready", data });
    } catch (error) {
      setTestResult({
        title: toolName,
        status: "error",
        data: error instanceof Error ? error.message : "支付测试失败",
      });
    }
  }

  async function fetchModels(updateMessage: boolean) {
    if (!providerDraft.baseUrl.trim() || !providerDraft.apiKey.trim()) {
      setProviderModelMessage("请填写 Base URL 和 API Key");
      return;
    }

    setLoadingModels(true);
    if (updateMessage) {
      setProviderModelMessage("加载模型中");
    }

    try {
      const result = await requestAdmin<ModelsResponse>(normalizedApiBase, token, "/admin/ai-providers/models", {
        method: "POST",
        body: JSON.stringify({
          baseUrl: providerDraft.baseUrl,
          apiKey: providerDraft.apiKey,
        }),
      });
      setProviderModels(result.models);
      setProviderModelMessage(result.models.length > 0 ? `已加载 ${result.models.length} 个模型` : "未返回模型");
      if (!providerDraft.model.trim() && result.firstModel) {
        setProviderDraft((current) => ({ ...current, model: result.firstModel ?? current.model }));
      }
    } catch (error) {
      setProviderModels([]);
      setProviderModelMessage(error instanceof Error ? `模型加载失败：${error.message}` : "模型加载失败");
    } finally {
      setLoadingModels(false);
    }
  }

  async function saveProvider() {
    setSavingProvider(true);
    setMessage(editingProviderId ? "保存服务商中" : "创建服务商中");

    const payload = toProviderPayload(providerDraft, Boolean(editingProviderId));
    const path = editingProviderId
      ? `/admin/ai-providers/${encodeURIComponent(editingProviderId)}`
      : "/admin/ai-providers";

    try {
      const result = await requestAdmin<{ provider: AiProvider }>(normalizedApiBase, token, path, {
        method: editingProviderId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setProviders((current) =>
        editingProviderId
          ? current.map((provider) => (provider.id === result.provider.id ? result.provider : provider))
          : [result.provider, ...current],
      );
      resetProviderDraft();
      setStatus("ready");
      setMessage(editingProviderId ? "服务商已保存" : "服务商已创建");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "服务商保存失败");
    } finally {
      setSavingProvider(false);
    }
  }

  async function deleteProvider(id: string) {
    const confirmed = window.confirm("确认删除这个 AI 服务商？");
    if (!confirmed) {
      return;
    }

    try {
      await requestAdmin<{ ok: true }>(normalizedApiBase, token, `/admin/ai-providers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setProviders((current) => current.filter((provider) => provider.id !== id));
      if (editingProviderId === id) {
        resetProviderDraft();
      }
      setStatus("ready");
      setMessage("服务商已删除");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "服务商删除失败");
    }
  }

  async function saveQuestion() {
    setSavingQuestion(true);
    setMessage(editingQuestionId ? "保存题目中" : "创建题目中");

    const path = editingQuestionId
      ? `/admin/questions/${encodeURIComponent(editingQuestionId)}`
      : "/admin/questions";

    try {
      const result = await requestAdmin<{ question: QuestionAdminItem }>(normalizedApiBase, token, path, {
        method: editingQuestionId ? "PATCH" : "POST",
        body: JSON.stringify(toQuestionPayload(questionDraft)),
      });
      setQuestions((current) =>
        editingQuestionId
          ? current.map((question) => (question.id === result.question.id ? result.question : question))
          : [result.question, ...current],
      );
      resetQuestionDraft();
      setStatus("ready");
      setMessage(editingQuestionId ? "题目已保存" : "题目已创建");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "题目保存失败");
    } finally {
      setSavingQuestion(false);
    }
  }

  async function deleteQuestion(id: string) {
    const confirmed = window.confirm("确认删除这道题？");
    if (!confirmed) {
      return;
    }

    try {
      await requestAdmin<{ ok: true }>(normalizedApiBase, token, `/admin/questions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      setQuestions((current) => current.filter((question) => question.id !== id));
      if (editingQuestionId === id) {
        resetQuestionDraft();
      }
      setStatus("ready");
      setMessage("题目已删除");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "题目删除失败");
    }
  }

  async function saveTool(toolName: string) {
    const draft = drafts[toolName];
    if (!draft) {
      return;
    }

    setSavingTool(toolName);
    setMessage("保存工具中");

    try {
      const result = await requestAdmin<{ tool: ToolConfig }>(
        normalizedApiBase,
        token,
        `/admin/tools/${encodeURIComponent(toolName)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            enabled: draft.enabled,
            paid: draft.paid,
            price: draft.price,
            scheme: draft.scheme,
            network: draft.network,
            payTo: draft.payTo,
          }),
        },
      );

      setTools((current) => current.map((tool) => (tool.name === toolName ? result.tool : tool)));
      setDrafts((current) => ({ ...current, [toolName]: toDraft(result.tool) }));
      setStatus("ready");
      setMessage("工具已保存");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "工具保存失败");
    } finally {
      setSavingTool(null);
    }
  }

  function updateDraft(toolName: string, patch: Partial<DraftToolConfig>) {
    setDrafts((current) => {
      const existing = current[toolName];
      if (!existing) {
        return current;
      }

      return {
        ...current,
        [toolName]: {
          ...existing,
          ...patch,
        },
      };
    });
  }

  function editProvider(provider: AiProvider) {
    setEditingProviderId(provider.id);
    setProviderDraft({
      provider: provider.provider,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiKey: "",
      model: provider.model,
      status: provider.status,
      note: provider.note,
      sortOrder: String(provider.sortOrder),
    });
    setProviderModels([]);
    setProviderModelMessage(provider.apiKeyPreview ? `已保存 ${provider.apiKeyPreview}` : "");
  }

  function resetProviderDraft() {
    setEditingProviderId(null);
    setProviderDraft(defaultProviderDraft());
    setProviderModels([]);
    setProviderModelMessage("");
    modelFetchKeyRef.current = "";
  }

  function editQuestion(question: QuestionAdminItem) {
    setEditingQuestionId(question.id);
    setQuestionDraft({
      category: question.category,
      text: question.text,
      dimension: question.dimension,
      enabled: question.enabled,
      sortOrder: String(question.sortOrder),
      options: question.options.map((option) => ({
        id: option.id,
        label: option.label,
        score: String(option.score),
      })),
    });
  }

  function resetQuestionDraft() {
    setEditingQuestionId(null);
    setQuestionDraft(defaultQuestionDraft());
  }

  const sampleScoreArgs = { answers: buildSampleAnswers(getSampleQuestionIds(questions)) };
  const callExamples = [
    {
      title: "免费元数据调用",
      command: createCurlExample(normalizedApiBase, "ctbz_assessment_meta"),
    },
    {
      title: "收费抽题：首次请求获取 402",
      command: createCurlExample(normalizedApiBase, "ctbz_draw_questions"),
    },
    {
      title: "收费抽题：携带 x402 支付凭证重试",
      command: createPaidRetryCurlExample(normalizedApiBase, "ctbz_draw_questions"),
    },
    {
      title: "收费评分：携带 20 个答案",
      command: createPaidRetryCurlExample(normalizedApiBase, "ctbz_score_assessment", sampleScoreArgs),
    },
  ];

  if (!authenticated) {
    return (
      <LoginScreen
        apiBase={apiBase}
        token={token}
        showToken={showToken}
        status={status}
        message={message}
        onApiBaseChange={setApiBase}
        onTokenChange={setToken}
        onToggleToken={() => setShowToken((value) => !value)}
        onLogin={login}
      />
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-[1440px] min-w-0 flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex shrink-0 flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_26px_hsl(var(--primary)/0.18)]">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">A2MCP 管理后台</h1>
              <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{normalizedApiBase}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={status} message={message} />
            <Button type="button" variant="outline" className="gap-2" onClick={() => refreshAll()}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              刷新
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={logout}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              退出登录
            </Button>
          </div>
        </header>

        <div className="grid min-w-0 flex-1 gap-5 py-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-5">
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <SectionTitle icon={Check} title="免费工具" />
              <div className="mt-3 space-y-2">
                {freeTools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无数据</p>
                ) : (
                  freeTools.map((toolName) => (
                    <div
                      key={toolName}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
                    >
                      {toolName}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <PanelHeader icon={Wallet} title="调用测试" description="Reown 钱包连接与 x402 收费调用" />

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-foreground">钱包状态</h2>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {isConnected && address ? `${shortAddress(address)} · chain ${chainId ?? "-"}` : "未连接钱包"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => open({ view: "Connect" })}>
                        <Wallet className="h-4 w-4" aria-hidden="true" />
                        {isConnected ? "切换钱包" : "连接钱包"}
                      </Button>
                      {isConnected ? (
                        <Button type="button" variant="outline" className="gap-2" onClick={() => disconnect()}>
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          断开
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <Button type="button" variant="secondary" className="gap-2" onClick={runMetaTest}>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      测试元数据
                    </Button>
                    <Button type="button" className="gap-2" onClick={() => runPaidToolTest("ctbz_draw_questions")}>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      支付抽题
                    </Button>
                    <Button type="button" className="gap-2" onClick={() => runPaidToolTest("ctbz_score_assessment")}>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      支付评分
                    </Button>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs font-semibold text-muted-foreground">
                    {tools
                      .filter((tool) => tool.name === "ctbz_draw_questions" || tool.name === "ctbz_score_assessment")
                      .map((tool) => (
                        <div key={tool.name} className="rounded-lg border border-border bg-card px-3 py-2">
                          <div className="text-foreground">{tool.name}</div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            <span>{tool.priceLabel}</span>
                            <span>收款 {shortAddress(tool.payTo)}</span>
                          </div>
                        </div>
                      ))}
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{testResult.title}</div>
                      <StatusBadge status={testResult.status} />
                    </div>
                    <pre className="mt-3 max-h-[320px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                      {formatJson(testResult.data)}
                    </pre>
                  </div>
                </div>

                <div className="min-w-0 space-y-3">
                  {callExamples.map((example) => (
                    <article key={example.title} className="rounded-lg border border-border bg-background p-3">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Code2 className="h-4 w-4 text-primary" aria-hidden="true" />
                        {example.title}
                      </div>
                      <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap break-words rounded-lg bg-card p-3 text-xs leading-relaxed text-muted-foreground">
                        {example.command}
                      </pre>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <PanelHeader
                icon={Bot}
                title="AI 服务商"
                description="OpenAI 兼容 /v1 根路径用于 AI 评分"
              />

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-foreground">
                      {editingProviderId ? "编辑 AI 服务商" : "新建 AI 服务商"}
                    </h2>
                    {editingProviderId ? (
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetProviderDraft}>
                        <X className="h-4 w-4" aria-hidden="true" />
                        取消
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <SelectInput
                      label="提供商"
                      value={providerDraft.provider}
                      onChange={(provider) => setProviderDraft((current) => ({ ...current, provider }))}
                      options={PROVIDER_OPTIONS}
                    />
                    <FieldInput
                      label="名称"
                      value={providerDraft.name}
                      onChange={(name) => setProviderDraft((current) => ({ ...current, name }))}
                    />
                    <FieldInput
                      label="Base URL"
                      value={providerDraft.baseUrl}
                      onChange={(baseUrl) => setProviderDraft((current) => ({ ...current, baseUrl }))}
                      className="sm:col-span-2"
                      placeholder="https://api.openai.com/v1"
                    />
                    <FieldInput
                      label="API Key"
                      value={providerDraft.apiKey}
                      onChange={(apiKey) => setProviderDraft((current) => ({ ...current, apiKey }))}
                      className="sm:col-span-2"
                      type="password"
                      placeholder={editingProviderId ? "留空则不更新" : ""}
                    />
                    <div className="sm:col-span-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <FieldInput
                          label="模型"
                          value={providerDraft.model}
                          onChange={(model) => setProviderDraft((current) => ({ ...current, model }))}
                          className="min-w-0 flex-1"
                          list="ai-provider-models"
                          placeholder="gpt-4o-mini"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => fetchModels(true)}
                          disabled={loadingModels}
                        >
                          <RefreshCw className={cn("h-4 w-4", loadingModels && "animate-spin")} aria-hidden="true" />
                          加载模型
                        </Button>
                      </div>
                      <datalist id="ai-provider-models">
                        {providerModels.map((model) => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                      {providerModelMessage ? (
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">{providerModelMessage}</p>
                      ) : null}
                    </div>
                    <SelectInput
                      label="状态"
                      value={providerDraft.status}
                      onChange={(status) =>
                        setProviderDraft((current) => ({
                          ...current,
                          status: status === "active" ? "active" : "inactive",
                        }))
                      }
                      options={[
                        { value: "active", label: "active" },
                        { value: "inactive", label: "inactive" },
                      ]}
                    />
                    <FieldInput
                      label="排序"
                      value={providerDraft.sortOrder}
                      onChange={(sortOrder) => setProviderDraft((current) => ({ ...current, sortOrder }))}
                      type="number"
                    />
                    <FieldInput
                      label="备注"
                      value={providerDraft.note}
                      onChange={(note) => setProviderDraft((current) => ({ ...current, note }))}
                      className="sm:col-span-2"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button type="button" className="gap-2" onClick={saveProvider} disabled={savingProvider}>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {savingProvider ? "保存中" : editingProviderId ? "保存" : "创建"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetProviderDraft}>
                      取消
                    </Button>
                  </div>
                </div>

                <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-background">
                  <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold text-muted-foreground">
                        <th className="border-b border-border px-3 py-2">名称</th>
                        <th className="border-b border-border px-3 py-2">模型</th>
                        <th className="border-b border-border px-3 py-2">状态</th>
                        <th className="border-b border-border px-3 py-2">Key</th>
                        <th className="border-b border-border px-3 py-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-muted-foreground" colSpan={5}>
                            暂无服务商
                          </td>
                        </tr>
                      ) : (
                        providers.map((provider) => (
                          <tr key={provider.id} className="[content-visibility:auto]">
                            <td className="border-b border-border px-3 py-3">
                              <div className="font-semibold text-foreground">{provider.name}</div>
                              <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                                {provider.baseUrl}
                              </div>
                            </td>
                            <td className="border-b border-border px-3 py-3 font-semibold">{provider.model}</td>
                            <td className="border-b border-border px-3 py-3">
                              <StatusBadge status={provider.status} />
                            </td>
                            <td className="border-b border-border px-3 py-3 text-muted-foreground">
                              {provider.apiKeySet ? provider.apiKeyPreview : "-"}
                            </td>
                            <td className="border-b border-border px-3 py-3">
                              <div className="flex gap-2">
                                <IconButton label="编辑服务商" onClick={() => editProvider(provider)}>
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                                <IconButton label="删除服务商" onClick={() => deleteProvider(provider.id)} danger>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <PanelHeader
                icon={Database}
                title="题库管理"
                description={`${questions.length} 道题，抽题只使用启用题目`}
              />

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-semibold text-foreground">
                      {editingQuestionId ? "编辑题目" : "新增题目"}
                    </h2>
                    {editingQuestionId ? (
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={resetQuestionDraft}>
                        <X className="h-4 w-4" aria-hidden="true" />
                        取消
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <FieldInput
                      label="分类"
                      value={questionDraft.category}
                      onChange={(category) => setQuestionDraft((current) => ({ ...current, category }))}
                    />
                    <SelectInput
                      label="维度"
                      value={questionDraft.dimension}
                      onChange={(dimension) =>
                        setQuestionDraft((current) => ({ ...current, dimension: dimension as DimensionId }))
                      }
                      options={allDimensions.map((dimension) => ({ value: dimension.id, label: dimension.name }))}
                    />
                    <TextareaInput
                      label="题干"
                      value={questionDraft.text}
                      onChange={(text) => setQuestionDraft((current) => ({ ...current, text }))}
                      className="sm:col-span-2"
                    />
                    <FieldInput
                      label="排序"
                      value={questionDraft.sortOrder}
                      onChange={(sortOrder) => setQuestionDraft((current) => ({ ...current, sortOrder }))}
                      type="number"
                    />
                    <div className="flex items-end">
                      <ToggleControl
                        label="启用"
                        checked={questionDraft.enabled}
                        onChange={(enabled) => setQuestionDraft((current) => ({ ...current, enabled }))}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {questionDraft.options.map((option, index) => (
                      <div key={option.id} className="grid gap-2 sm:grid-cols-[52px_minmax(0,1fr)_90px]">
                        <div className="flex h-10 items-center text-sm font-semibold text-muted-foreground">
                          选项 {option.id}
                        </div>
                        <input
                          value={option.label}
                          onChange={(event) =>
                            setQuestionDraft((current) => ({
                              ...current,
                              options: current.options.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, label: event.target.value } : item,
                              ),
                            }))
                          }
                          className="h-10 min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                        <input
                          value={option.score}
                          type="number"
                          step="0.1"
                          onChange={(event) =>
                            setQuestionDraft((current) => ({
                              ...current,
                              options: current.options.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, score: event.target.value } : item,
                              ),
                            }))
                          }
                          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button type="button" className="gap-2" onClick={saveQuestion} disabled={savingQuestion}>
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {savingQuestion ? "保存中" : editingQuestionId ? "保存" : "创建"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetQuestionDraft}>
                      取消
                    </Button>
                  </div>
                </div>

                <div className="min-w-0 overflow-x-auto rounded-lg border border-border bg-background">
                  <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-sm">
                    <thead>
                      <tr className="text-xs font-semibold text-muted-foreground">
                        <th className="border-b border-border px-3 py-2">题目</th>
                        <th className="border-b border-border px-3 py-2">维度</th>
                        <th className="border-b border-border px-3 py-2">状态</th>
                        <th className="border-b border-border px-3 py-2">排序</th>
                        <th className="border-b border-border px-3 py-2">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.length === 0 ? (
                        <tr>
                          <td className="px-3 py-5 text-center text-muted-foreground" colSpan={5}>
                            暂无题目
                          </td>
                        </tr>
                      ) : (
                        questions.map((question) => (
                          <tr key={question.id} className="[content-visibility:auto]">
                            <td className="border-b border-border px-3 py-3">
                              <div className="max-w-[420px] truncate font-semibold text-foreground">
                                {question.text}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {question.id} · {question.category}
                              </div>
                            </td>
                            <td className="border-b border-border px-3 py-3">
                              {getDimensionName(question.dimension)}
                            </td>
                            <td className="border-b border-border px-3 py-3">
                              <StatusBadge status={question.enabled ? "启用" : "停用"} />
                            </td>
                            <td className="border-b border-border px-3 py-3 font-semibold">{question.sortOrder}</td>
                            <td className="border-b border-border px-3 py-3">
                              <div className="flex gap-2">
                                <IconButton label="编辑题目" onClick={() => editQuestion(question)}>
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                                <IconButton label="删除题目" onClick={() => deleteQuestion(question.id)} danger>
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </IconButton>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <PanelHeader icon={Settings} title="工具配置" description="价格、收款地址、启用状态" />

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {tools.length === 0 ? (
                  <EmptyPanel label="暂无工具配置" />
                ) : (
                  tools.map((tool) => {
                    const draft = drafts[tool.name] ?? toDraft(tool);
                    const isSaving = savingTool === tool.name;

                    return (
                      <article key={tool.name} className="rounded-lg border border-border bg-background p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h2 className="text-base font-semibold text-foreground">{tool.name}</h2>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                              更新时间 {formatDateTime(tool.updatedAt)}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <ToggleControl
                              label="启用"
                              checked={draft.enabled}
                              onChange={(enabled) => updateDraft(tool.name, { enabled })}
                            />
                            <ToggleControl
                              label="收费"
                              checked={draft.paid}
                              onChange={(paid) => updateDraft(tool.name, { paid })}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <FieldInput
                            label="价格"
                            value={draft.price}
                            onChange={(price) => updateDraft(tool.name, { price })}
                          />
                          <FieldInput
                            label="协议"
                            value={draft.scheme}
                            onChange={(scheme) => updateDraft(tool.name, { scheme })}
                          />
                          <FieldInput
                            label="网络"
                            value={draft.network}
                            onChange={(network) => updateDraft(tool.name, { network })}
                          />
                          <FieldInput
                            label="收款地址"
                            value={draft.payTo}
                            onChange={(payTo) => updateDraft(tool.name, { payTo })}
                            className="sm:col-span-2"
                          />
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
                          <div className="text-sm font-semibold text-muted-foreground">
                            当前显示 {tool.priceLabel}
                          </div>
                          <Button type="button" className="gap-2" onClick={() => saveTool(tool.name)} disabled={isSaving}>
                            <Save className="h-4 w-4" aria-hidden="true" />
                            {isSaving ? "保存中" : "保存"}
                          </Button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <PanelHeader icon={Activity} title="调用日志" description="最近 50 条" />

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-muted-foreground">
                      <th className="border-b border-border px-3 py-2">时间</th>
                      <th className="border-b border-border px-3 py-2">工具</th>
                      <th className="border-b border-border px-3 py-2">状态</th>
                      <th className="border-b border-border px-3 py-2">HTTP</th>
                      <th className="border-b border-border px-3 py-2">价格</th>
                      <th className="border-b border-border px-3 py-2">错误</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.length === 0 ? (
                      <tr>
                        <td className="px-3 py-5 text-center text-muted-foreground" colSpan={6}>
                          暂无日志
                        </td>
                      </tr>
                    ) : (
                      calls.map((call) => (
                        <tr key={call.id} className="text-foreground">
                          <td className="border-b border-border px-3 py-3 text-muted-foreground">
                            {formatDateTime(call.createdAt)}
                          </td>
                          <td className="border-b border-border px-3 py-3 font-semibold">{call.toolName}</td>
                          <td className="border-b border-border px-3 py-3">
                            <StatusBadge status={call.status} />
                          </td>
                          <td className="border-b border-border px-3 py-3 font-semibold">{call.httpStatus}</td>
                          <td className="border-b border-border px-3 py-3">{call.price ?? "-"}</td>
                          <td className="max-w-[260px] truncate border-b border-border px-3 py-3 text-muted-foreground">
                            {call.error ?? "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginScreen({
  apiBase,
  token,
  showToken,
  status,
  message,
  onApiBaseChange,
  onTokenChange,
  onToggleToken,
  onLogin,
}: {
  apiBase: string;
  token: string;
  showToken: boolean;
  status: LoadState;
  message: string;
  onApiBaseChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onToggleToken: () => void;
  onLogin: () => void;
}) {
  return (
    <main className="grid min-h-screen bg-background px-5 py-8 text-foreground">
      <section className="mx-auto flex w-full max-w-[480px] flex-col justify-center">
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">后台登录</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">A2MCP 管理后台</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <FieldInput label="API 地址" value={apiBase} onChange={onApiBaseChange} />

            <label className="block text-xs font-semibold text-muted-foreground" htmlFor="admin-login-token">
              ADMIN_TOKEN
            </label>
            <div className="flex h-10 overflow-hidden rounded-lg border border-input bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <input
                id="admin-login-token"
                value={token}
                type={showToken ? "text" : "password"}
                onChange={(event) => onTokenChange(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                aria-label={showToken ? "隐藏 token" : "显示 token"}
                onClick={onToggleToken}
                className="grid w-10 place-items-center border-l border-border text-muted-foreground transition hover:text-foreground"
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <StatusPill status={status} message={message} />
            <Button type="button" className="gap-2" onClick={onLogin}>
              <Database className="h-4 w-4" aria-hidden="true" />
              登录
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Settings; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      {title}
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{description}</span>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  className,
  type = "text",
  placeholder,
  list,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
  list?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        list={list}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function TextareaInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary"
      />
      {label}
    </label>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:text-foreground",
        danger && "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

function StatusPill({ status, message }: { status: LoadState; message: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold",
        status === "ready" && "border-primary/30 bg-primary/10 text-primary",
        status === "loading" && "border-border bg-secondary text-secondary-foreground",
        status === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        status === "idle" && "border-border bg-secondary text-muted-foreground",
      )}
    >
      {message}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isSuccess = status === "success" || status === "active" || status === "启用" || status === "ready";
  const isPayment = status === "payment_required";
  const isNeutral = status === "inactive" || status === "停用" || status === "idle" || status === "running";
  return (
    <span
      className={cn(
        "inline-flex rounded-lg border px-2 py-1 text-xs font-semibold",
        isSuccess && "border-primary/30 bg-primary/10 text-primary",
        isPayment && "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
        isNeutral && "border-border bg-secondary text-muted-foreground",
        !isSuccess && !isPayment && !isNeutral && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

function EmptyPanel({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-background p-6 text-center text-sm font-semibold text-muted-foreground">
      {label}
    </div>
  );
}

async function requestAdmin<T>(
  apiBase: string,
  token: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token.trim()}`,
      ...init.headers,
    },
  });
  const text = await response.text();
  const data = parseJsonResponse(text);

  if (!response.ok) {
    const reason = data?.reason ?? data?.error ?? `HTTP ${response.status}`;
    throw new Error(reason);
  }

  return data as T;
}

function parseJsonResponse(text: string): any {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function defaultProviderDraft(): ProviderDraft {
  return {
    provider: "openai-compatible",
    name: "",
    baseUrl: "",
    apiKey: "",
    model: "",
    status: "active",
    note: "",
    sortOrder: "0",
  };
}

function defaultQuestionDraft(): QuestionDraft {
  return {
    category: "",
    text: "",
    dimension: "organization",
    enabled: true,
    sortOrder: "0",
    options: [
      { id: "A", label: "", score: "3" },
      { id: "B", label: "", score: "2" },
      { id: "C", label: "", score: "1" },
      { id: "D", label: "", score: "0" },
    ],
  };
}

function toProviderPayload(draft: ProviderDraft, isPatch: boolean) {
  const payload: Record<string, unknown> = {
    provider: draft.provider,
    name: draft.name.trim() || draft.provider,
    baseUrl: draft.baseUrl,
    model: draft.model,
    status: draft.status,
    note: draft.note,
    sortOrder: toInteger(draft.sortOrder),
  };

  if (!isPatch || draft.apiKey.trim()) {
    payload.apiKey = draft.apiKey;
  }

  return payload;
}

function toQuestionPayload(draft: QuestionDraft) {
  return {
    category: draft.category,
    text: draft.text,
    dimension: draft.dimension,
    enabled: draft.enabled,
    sortOrder: toInteger(draft.sortOrder),
    options: draft.options.map((option) => ({
      id: option.id,
      label: option.label,
      score: toNumber(option.score),
    })),
  };
}

function toDraft(tool: ToolConfig): DraftToolConfig {
  return {
    enabled: tool.enabled,
    paid: tool.paid,
    price: tool.price.replace(/^\$/, ""),
    scheme: tool.scheme,
    network: tool.network,
    payTo: tool.payTo,
  };
}

function normalizeApiBase(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function getInitialApiBase() {
  const storedValue = getStoredValue(API_BASE_STORAGE_KEY, DEFAULT_API_BASE);
  return LEGACY_API_BASES.includes(normalizeApiBase(storedValue)) ? DEFAULT_API_BASE : storedValue;
}

function getStoredValue(key: string, defaultValue: string) {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key) ?? defaultValue;
}

function getDimensionName(id: DimensionId) {
  return allDimensions.find((dimension) => dimension.id === id)?.name ?? id;
}

function getSampleQuestionIds(questions: QuestionAdminItem[]) {
  const ids = questions.slice(0, 20).map((question) => question.id);
  if (ids.length >= 20) {
    return ids;
  }

  return Array.from({ length: 20 }, (_, index) => `q-${String(index + 1).padStart(3, "0")}`);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function toInteger(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatJson(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value, null, 2);
}

export default function AdminDashboard() {
  return <AdminDashboardInner />;
}
