import { questionBank, type Question, type QuestionOption, type ResultLevel } from "@/data/questions";
import { scoreQuestionSession, SESSION_SIZE, type AnswerRecord, type DimensionScore } from "@/lib/assessment";

export const FILECOIN_RECEIPT_STORAGE_KEY = "ctbz_filecoin_receipt_draft";
export const FILECOIN_AUTO_UPLOAD_STORAGE_KEY = "ctbz_filecoin_auto_upload";
export const FILECOIN_RECEIPT_ADAPTER_SOURCE = "ctbz-assessment-receipt";

export const FILECOIN_RECEIPT_ADAPTER_MANIFEST = {
  challenge: {
    name: "FilecoinTLDR Builder Challenge",
    cycle: "Cycle 3",
    track: "Filecoin Tool, Adapter, or Developer Utility",
  },
  adapter: {
    kind: "agent-result-receipt-adapter",
    input: "草台班子检测结果 JSON",
    output: "Filecoin PieceCID + provider retrieval URL",
  },
  filecoin: {
    network: "Filecoin Calibration",
    primitive: "Synapse Warm Storage",
    sdk: "@filoz/synapse-sdk",
    source: FILECOIN_RECEIPT_ADAPTER_SOURCE,
  },
} as const;

export type AssessmentScoreSnapshot = {
  version: string;
  answeredCount: number;
  rawScore: number;
  minScore: number;
  maxScore: number;
  health: number;
  level: ResultLevel;
  dimensions: DimensionScore[];
};

export type AssessmentReceiptAnswer = {
  questionId: string;
  category: string;
  text: string;
  option: {
    id: QuestionOption["id"];
    label: string;
    score: number;
    attribute: string;
  };
};

export type AssessmentReceipt = {
  schema: "ctbz.assessment.receipt";
  schemaVersion: "1.0.0";
  receiptId: string;
  createdAt: string;
  mode: "live-assessment" | "demo-receipt";
  challenge: typeof FILECOIN_RECEIPT_ADAPTER_MANIFEST.challenge;
  adapter: typeof FILECOIN_RECEIPT_ADAPTER_MANIFEST.adapter;
  filecoin: typeof FILECOIN_RECEIPT_ADAPTER_MANIFEST.filecoin;
  app: {
    name: "草台班子检测器";
    origin: string;
  };
  assessment: {
    version: string;
    answeredCount: number;
    rawScore: number;
    minScore: number;
    maxScore: number;
    health: number;
    level: ResultLevel;
    dimensions: DimensionScore[];
  };
  answers: AssessmentReceiptAnswer[];
};

export function buildAssessmentReceipt({
  answers,
  appOrigin,
  mode = "live-assessment",
  questions,
  result,
}: {
  answers: AnswerRecord;
  appOrigin: string;
  mode?: AssessmentReceipt["mode"];
  questions: Question[];
  result: AssessmentScoreSnapshot;
}): AssessmentReceipt {
  return {
    schema: "ctbz.assessment.receipt",
    schemaVersion: "1.0.0",
    receiptId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    mode,
    challenge: FILECOIN_RECEIPT_ADAPTER_MANIFEST.challenge,
    adapter: FILECOIN_RECEIPT_ADAPTER_MANIFEST.adapter,
    filecoin: FILECOIN_RECEIPT_ADAPTER_MANIFEST.filecoin,
    app: {
      name: "草台班子检测器",
      origin: appOrigin,
    },
    assessment: {
      version: result.version,
      answeredCount: result.answeredCount,
      rawScore: result.rawScore,
      minScore: result.minScore,
      maxScore: result.maxScore,
      health: result.health,
      level: result.level,
      dimensions: result.dimensions,
    },
    answers: questions
      .map((question) => {
        const option = answers[question.id];
        if (!option) {
          return null;
        }

        return {
          questionId: question.id,
          category: question.category,
          text: question.text,
          option: {
            id: option.id,
            label: option.label,
            score: option.score,
            attribute: option.attribute,
          },
        };
      })
      .filter((answer): answer is AssessmentReceiptAnswer => Boolean(answer)),
  };
}

export function buildDemoAssessmentReceipt(appOrigin: string) {
  const questions = questionBank.slice(0, SESSION_SIZE);
  const answers = questions.reduce<AnswerRecord>((record, question, index) => {
    record[question.id] = question.options[index % question.options.length];
    return record;
  }, {});
  const result = scoreQuestionSession(questions, answers);

  return buildAssessmentReceipt({
    answers,
    appOrigin,
    mode: "demo-receipt",
    questions,
    result,
  });
}

export function serializeAssessmentReceipt(receipt: AssessmentReceipt) {
  return JSON.stringify(receipt, null, 2);
}

export function saveAssessmentReceiptDraft(receipt: AssessmentReceipt) {
  window.sessionStorage.setItem(FILECOIN_RECEIPT_STORAGE_KEY, serializeAssessmentReceipt(receipt));
}

export function readAssessmentReceiptDraft() {
  const raw = window.sessionStorage.getItem(FILECOIN_RECEIPT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AssessmentReceipt;
  } catch {
    window.sessionStorage.removeItem(FILECOIN_RECEIPT_STORAGE_KEY);
    return null;
  }
}
