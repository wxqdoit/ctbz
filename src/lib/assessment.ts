import {
  allDimensions,
  questionBank,
  resultLevels,
  validateQuestionBank,
  type DimensionId,
  type OptionId,
  type Question,
  type QuestionOption,
} from "../data/questions";

validateQuestionBank();

export const ASSESSMENT_VERSION = "ctbz-2026-07-07";
export const SESSION_SIZE = 20;

export type AnswerRecord = Record<string, QuestionOption | undefined>;

export type AssessmentAnswerInput = {
  questionId: string;
  optionId: OptionId;
};

export type PublicQuestionOption = {
  id: OptionId;
  label: string;
};

export type PublicQuestion = {
  id: string;
  category: string;
  text: string;
  options: PublicQuestionOption[];
};

export type DimensionScore = {
  id: DimensionId;
  name: string;
  answeredCount: number;
  rawScore: number;
  health: number;
};

function randomIndex(max: number) {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

export function drawAssessmentQuestions() {
  return drawAssessmentQuestionsFromBank(questionBank);
}

export function drawAssessmentQuestionsFromBank(bank: Question[]) {
  if (bank.length < SESSION_SIZE) {
    throw new Error(`Question bank must contain at least ${SESSION_SIZE} enabled questions.`);
  }

  const pool = [...bank];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [pool[index], pool[target]] = [pool[target], pool[index]];
  }

  const session = pool.slice(0, SESSION_SIZE);
  const visibleTexts = new Set(session.map((question) => question.text));
  if (visibleTexts.size !== session.length) {
    throw new Error("Drawn session contains duplicate visible question text.");
  }

  return session;
}

export function toPublicQuestion(question: Question): PublicQuestion {
  return {
    id: question.id,
    category: question.category,
    text: question.text,
    options: question.options.map((option) => ({
      id: option.id,
      label: option.label,
    })),
  };
}

export function getAnswer(answers: AnswerRecord, question: Question) {
  return answers[question.id];
}

export function getResultEmoji(tone: string) {
  switch (tone) {
    case "stable":
      return "🛡️";
    case "healthy":
      return "🌿";
    case "warning":
      return "⚠️";
    case "danger":
      return "💩";
    case "collapse":
      return "☠️";
    default:
      return "🧪";
  }
}

export function scoreQuestionSession(questions: Question[], answers: AnswerRecord) {
  const answeredPairs = questions
    .map((question) => ({ question, option: getAnswer(answers, question) }))
    .filter((item): item is { question: Question; option: QuestionOption } => Boolean(item.option));

  return scoreAnsweredPairs(answeredPairs);
}

export function scoreAssessmentAnswers(answers: AssessmentAnswerInput[]) {
  return scoreAssessmentAnswersFromQuestions(questionBank, answers);
}

export function scoreAssessmentAnswersFromQuestions(questions: Question[], answers: AssessmentAnswerInput[]) {
  if (answers.length !== SESSION_SIZE) {
    throw new Error(`Expected ${SESSION_SIZE} answers, received ${answers.length}.`);
  }

  const questionIds = new Set<string>();
  const answeredPairs = answers.map((answer) => {
    if (questionIds.has(answer.questionId)) {
      throw new Error(`Duplicate question id: ${answer.questionId}.`);
    }

    const question = getQuestionById(questions, answer.questionId);
    if (!question) {
      throw new Error(`Unknown question id: ${answer.questionId}.`);
    }

    const option = question.options.find((item) => item.id === answer.optionId);
    if (!option) {
      throw new Error(`Invalid option id ${answer.optionId} for ${answer.questionId}.`);
    }

    questionIds.add(answer.questionId);
    return { question, option };
  });

  return scoreAnsweredPairs(answeredPairs);
}

function getQuestionById(questions: Question[], questionId: string) {
  return questions.find((question) => question.id === questionId);
}

function scoreAnsweredPairs(answeredPairs: { question: Question; option: QuestionOption }[]) {
  if (answeredPairs.length === 0) {
    throw new Error("At least one answer is required.");
  }

  const rawScore = answeredPairs.reduce((sum, item) => sum + item.option.score, 0);
  const minScore = answeredPairs.reduce(
    (sum, item) => sum + Math.min(...item.question.options.map((option) => option.score)),
    0,
  );
  const maxScore = answeredPairs.reduce(
    (sum, item) => sum + Math.max(...item.question.options.map((option) => option.score)),
    0,
  );

  if (maxScore === minScore) {
    throw new Error("Score range is zero.");
  }

  const health = Math.round(((rawScore - minScore) / (maxScore - minScore)) * 100);
  const clampedHealth = Math.min(100, Math.max(0, health));
  const level =
    resultLevels.find((item) => clampedHealth >= item.range[0] && clampedHealth <= item.range[1]) ??
    resultLevels[resultLevels.length - 1];

  return {
    version: ASSESSMENT_VERSION,
    answeredCount: answeredPairs.length,
    rawScore,
    minScore,
    maxScore,
    health: clampedHealth,
    level,
    dimensions: scoreDimensions(answeredPairs),
  };
}

function scoreDimensions(answeredPairs: { question: Question; option: QuestionOption }[]) {
  return allDimensions.map((dimension): DimensionScore => {
    const pairs = answeredPairs.filter((item) => item.question.weights[dimension.id] > 0);
    if (pairs.length === 0) {
      return {
        id: dimension.id,
        name: dimension.name,
        answeredCount: 0,
        rawScore: 0,
        health: 0,
      };
    }

    const rawScore = pairs.reduce((sum, item) => sum + item.option.score, 0);
    const minScore = pairs.reduce(
      (sum, item) => sum + Math.min(...item.question.options.map((option) => option.score)),
      0,
    );
    const maxScore = pairs.reduce(
      (sum, item) => sum + Math.max(...item.question.options.map((option) => option.score)),
      0,
    );
    const health = Math.round(((rawScore - minScore) / (maxScore - minScore)) * 100);

    return {
      id: dimension.id,
      name: dimension.name,
      answeredCount: pairs.length,
      rawScore,
      health: Math.min(100, Math.max(0, health)),
    };
  });
}
