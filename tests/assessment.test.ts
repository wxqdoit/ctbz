import { describe, expect, it } from "vitest";
import { questionBank } from "../src/data/questions";
import {
  SESSION_SIZE,
  drawAssessmentQuestions,
  scoreAssessmentAnswers,
} from "../src/lib/assessment";

function answersFor(optionId: "A" | "B" | "C" | "D") {
  return questionBank.slice(0, SESSION_SIZE).map((question) => ({
    questionId: question.id,
    optionId,
  }));
}

describe("assessment core", () => {
  it("draws one 20-question session without duplicate question ids", () => {
    const questions = drawAssessmentQuestions();

    expect(questions).toHaveLength(SESSION_SIZE);
    expect(new Set(questions.map((question) => question.id)).size).toBe(SESSION_SIZE);
  });

  it("scores all A answers as the top result level", () => {
    const result = scoreAssessmentAnswers(answersFor("A"));

    expect(result.health).toBe(100);
    expect(result.level.name).toBe("稳住型");
    expect(result.answeredCount).toBe(SESSION_SIZE);
  });

  it("scores all D answers as the bottom result level", () => {
    const result = scoreAssessmentAnswers(answersFor("D"));

    expect(result.health).toBe(0);
    expect(result.level.name).toBe("纯草台型");
    expect(result.answeredCount).toBe(SESSION_SIZE);
  });

  it("rejects duplicate question ids", () => {
    const answers = answersFor("A");
    answers[1] = { ...answers[1], questionId: answers[0].questionId };

    expect(() => scoreAssessmentAnswers(answers)).toThrow("Duplicate question id");
  });

  it("rejects incomplete answer sets", () => {
    expect(() => scoreAssessmentAnswers(answersFor("A").slice(0, SESSION_SIZE - 1))).toThrow(
      `Expected ${SESSION_SIZE} answers`,
    );
  });
});
