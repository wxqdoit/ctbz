import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import anime from "animejs/lib/anime.es.js";
import { useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { ArrowLeft, ArrowRight, Database, RotateCcw, Wallet } from "lucide-react";
import ctbzLogoUrl from "@/assets/ctbz-logo-header.png";
import PlasmaWave from "@/components/PlasmaWave";
import Shuffle from "@/components/Shuffle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionOption } from "@/data/questions";
import {
  drawAssessmentQuestions,
  getAnswer,
  getResultEmoji,
  scoreQuestionSession,
} from "@/lib/assessment";
import {
  FILECOIN_AUTO_UPLOAD_STORAGE_KEY,
  buildAssessmentReceipt,
  saveAssessmentReceiptDraft,
} from "@/lib/filecoinReceipt";

type Answers = Record<string, QuestionOption>;
type AppView = "admin" | "assessment" | "filecoin";

const AdminDashboard = lazy(() => import("@/AdminDashboard"));
const FilecoinReceiptLab = lazy(() => import("@/FilecoinReceiptLab"));

function getCurrentView(): AppView {
  if (window.location.hash === "#admin") {
    return "admin";
  }
  if (window.location.hash === "#filecoin") {
    return "filecoin";
  }
  return "assessment";
}

function hasReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function App() {
  const [view, setView] = useState(getCurrentView);
  const [started, setStarted] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [finished, setFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const questions = useMemo(drawAssessmentQuestions, [sessionKey]);
  const currentQuestion = questions[currentIndex];
  const selected = getAnswer(answers, currentQuestion);
  const answeredCount = Object.keys(answers).length;
  const progress = finished ? 100 : ((currentIndex + 1) / questions.length) * 100;
  const slideRef = useRef<HTMLDivElement>(null);
  const progressFillRef = useRef<HTMLDivElement>(null);
  const progressDotRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const resultRef = useRef<HTMLDivElement>(null);
  const landingRef = useRef<HTMLDivElement>(null);
  const transitionDirectionRef = useRef<1 | -1>(1);
  const autoAdvanceFrameRef = useRef<number | null>(null);
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();

  useEffect(() => {
    const handleHashChange = () => setView(getCurrentView());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (started || finished || hasReducedMotion() || !landingRef.current) {
      return;
    }

    anime({
      targets: landingRef.current.querySelectorAll("[data-landing-piece]"),
      opacity: [0, 1],
      translateY: [26, 0],
      delay: anime.stagger(90),
      duration: 720,
      easing: "easeOutCubic",
    });
  }, [finished, started]);

  useEffect(() => {
    if (hasReducedMotion() || !slideRef.current) {
      setIsTransitioning(false);
      return;
    }

    anime.remove(slideRef.current);
    anime({
      targets: slideRef.current,
      opacity: [0, 1],
      translateX: [transitionDirectionRef.current * 84, 0],
      scale: [0.985, 1],
      duration: 520,
      easing: "easeOutCubic",
      complete: () => setIsTransitioning(false),
    });

    anime({
      targets: Object.values(optionsRef.current)
        .map((button) => button?.querySelector("[data-option-content]"))
        .filter(Boolean),
      opacity: [0, 1],
      translateY: [16, 0],
      delay: anime.stagger(55),
      duration: 420,
      easing: "easeOutCubic",
    });
  }, [currentIndex, sessionKey]);

  useEffect(() => {
    if (hasReducedMotion()) {
      return;
    }

    if (progressFillRef.current) {
      anime.remove(progressFillRef.current);
      anime({
        targets: progressFillRef.current,
        width: `${progress}%`,
        duration: 520,
        easing: "easeOutQuart",
      });
    }

    if (progressDotRef.current) {
      anime.remove(progressDotRef.current);
      anime({
        targets: progressDotRef.current,
        left: `${progress}%`,
        duration: 520,
        easing: "easeOutQuart",
      });
    }
  }, [progress]);

  useEffect(() => {
    if (!finished || hasReducedMotion() || !resultRef.current) {
      return;
    }

    const pieces = resultRef.current.querySelectorAll("[data-result-piece]");
    const emoji = resultRef.current.querySelector("[data-result-emoji]");
    const glow = resultRef.current.querySelectorAll("[data-result-glow]");
    const card = resultRef.current.querySelector("[data-result-card]");

    anime({
      targets: pieces,
      opacity: [0, 1],
      translateY: [24, 0],
      delay: anime.stagger(90),
      duration: 620,
      easing: "easeOutCubic",
    });

    if (emoji) {
      anime({
        targets: emoji,
        opacity: [0, 1],
        scale: [0.62, 1.08, 1],
        rotate: [-8, 4, 0],
        duration: 920,
        easing: "easeOutElastic(1, .75)",
      });
    }

    if (card) {
      anime({
        targets: card,
        rotateX: [3, 0],
        rotateY: [-4, 0],
        scale: [0.965, 1],
        duration: 820,
        easing: "easeOutCubic",
        complete: () => {
          (card as HTMLElement).style.transform = "";
        },
      });
    }

    if (glow.length > 0) {
      anime({
        targets: glow,
        opacity: [0.2, 0.55],
        scale: [0.92, 1.08],
        duration: 1600,
        direction: "alternate",
        loop: true,
        easing: "easeInOutSine",
      });
    }

    return () => {
      anime.remove(pieces);
      if (emoji) {
        anime.remove(emoji);
      }
      if (glow.length > 0) {
        anime.remove(glow);
      }
      if (card) {
        anime.remove(card);
      }
    };
  }, [finished]);

  useEffect(() => () => clearAutoAdvance(), []);

  function clearAutoAdvance() {
    if (autoAdvanceFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(autoAdvanceFrameRef.current);
    autoAdvanceFrameRef.current = null;
  }

  function scheduleAutoAdvance(nextAnswers?: Answers) {
    clearAutoAdvance();
    autoAdvanceFrameRef.current = window.requestAnimationFrame(() => {
      autoAdvanceFrameRef.current = null;

      if (currentIndex === questions.length - 1) {
        finishAssessment(nextAnswers ?? answers);
        return;
      }

      moveToQuestion(currentIndex + 1, 1);
    });
  }

  function chooseOption(option: QuestionOption) {
    if (isTransitioning) {
      return;
    }

    const nextAnswers = { ...answers, [currentQuestion.id]: option };
    setAnswers(nextAnswers);

    requestAnimationFrame(() => {
      const target = optionsRef.current[option.id]?.querySelector("[data-option-content]");
      if (!target || hasReducedMotion()) {
        return;
      }

      anime.remove(target);
      anime({
        targets: target,
        scale: [0.985, 1],
        duration: 420,
        easing: "easeOutElastic(1, .7)",
      });
    });

    scheduleAutoAdvance(nextAnswers);
  }

  function resetOptionTilt(target: HTMLButtonElement) {
    target.style.transform = "";
  }

  function handleOptionPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (hasReducedMotion() || event.pointerType !== "mouse") {
      return;
    }

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    const rotateX = (-y * 7).toFixed(2);
    const rotateY = (x * 9).toFixed(2);
    target.style.transform = `perspective(960px) translateY(-4px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  }

  function moveToQuestion(nextIndex: number, direction: 1 | -1) {
    if (isTransitioning || nextIndex === currentIndex) {
      return;
    }

    clearAutoAdvance();
    transitionDirectionRef.current = direction;
    const slide = slideRef.current;
    setIsTransitioning(true);

    if (hasReducedMotion() || !slide) {
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
      return;
    }

    anime.remove(slide);
    anime({
      targets: slide,
      opacity: [1, 0],
      translateX: [0, direction === 1 ? -84 : 84],
      scale: [1, 0.985],
      duration: 240,
      easing: "easeInCubic",
      complete: () => setCurrentIndex(nextIndex),
    });
  }

  function finishAssessment(finalAnswers: Answers = answers) {
    if (isTransitioning) {
      return;
    }

    clearAutoAdvance();
    const slide = slideRef.current;
    setIsTransitioning(true);

    if (hasReducedMotion() || !slide) {
      openFilecoinReceipt(finalAnswers, true);
      return;
    }

    anime.remove(slide);
    anime({
      targets: slide,
      opacity: [1, 0],
      translateY: [0, -20],
      scale: [1, 0.985],
      duration: 260,
      easing: "easeInCubic",
      complete: () => openFilecoinReceipt(finalAnswers, true),
    });
  }

  function goPrevious() {
    moveToQuestion(Math.max(0, currentIndex - 1), -1);
  }

  function goNext() {
    if (isTransitioning) {
      return;
    }

    if (!selected) {
      const buttons = Object.values(optionsRef.current).filter(Boolean);
      if (!hasReducedMotion()) {
        anime({
          targets: buttons,
          translateX: [-6, 6, -4, 4, 0],
          duration: 360,
          easing: "easeInOutSine",
        });
      }
      return;
    }

    if (currentIndex === questions.length - 1) {
      finishAssessment(answers);
      return;
    }

    moveToQuestion(currentIndex + 1, 1);
  }

  function startAssessment() {
    clearAutoAdvance();
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setIsTransitioning(false);
    setSessionKey((key) => key + 1);
    setStarted(true);
  }

  function restart() {
    clearAutoAdvance();
    setAnswers({});
    setCurrentIndex(0);
    setFinished(false);
    setIsTransitioning(false);
    setSessionKey((key) => key + 1);
    setStarted(true);
  }

  function openFilecoinReceipt(finalAnswers: Answers = answers, autoUpload = false) {
    const result = scoreQuestionSession(questions, finalAnswers);
    const receipt = buildAssessmentReceipt({
      answers: finalAnswers,
      appOrigin: window.location.origin,
      questions,
      result,
    });

    saveAssessmentReceiptDraft(receipt);
    if (autoUpload) {
      window.sessionStorage.setItem(FILECOIN_AUTO_UPLOAD_STORAGE_KEY, "1");
    }
    window.location.hash = "filecoin";
    setView("filecoin");
  }

  function returnToAssessment() {
    window.location.hash = "";
    setView("assessment");
  }

  const hasWallet = isConnected && Boolean(address);

  if (view === "admin") {
    if (!hasWallet) {
      return <LandingPage landingRef={landingRef} mode="connect" onConnect={() => void open()} onStart={startAssessment} />;
    }

    return (
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center bg-background px-5 text-sm font-semibold text-muted-foreground">
            后台加载中
          </main>
        }
      >
        <AdminDashboard />
      </Suspense>
    );
  }

  if (view === "filecoin") {
    if (!hasWallet) {
      return <LandingPage landingRef={landingRef} mode="connect" onConnect={() => void open()} onStart={startAssessment} />;
    }

    return (
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center bg-background px-5 text-sm font-semibold text-muted-foreground">
            Filecoin 模块加载中
          </main>
        }
      >
        <FilecoinReceiptLab onBack={returnToAssessment} />
      </Suspense>
    );
  }

  if (!started && !finished) {
    return (
      <LandingPage
        landingRef={landingRef}
        mode={hasWallet ? "start" : "connect"}
        onConnect={() => void open()}
        onStart={startAssessment}
      />
    );
  }

  if (finished) {
    const result = scoreQuestionSession(questions, answers);
    const resultEmoji = getResultEmoji(result.level.tone);

    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen max-w-[1680px] flex-col bg-background px-6 py-7 sm:px-10 lg:px-12">
          <TopBar
            current={questions.length}
            total={questions.length}
            answered={answeredCount}
            progress={100}
            showEstimate={false}
          />

          <div
            ref={resultRef}
            className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center py-16 text-center"
          >
            <p data-result-piece className="text-sm font-semibold text-primary opacity-0">
              最终结果
            </p>
            <div
              data-result-piece
              data-result-card
              className="result-card-frame relative mt-8 w-full max-w-3xl rounded-[28px] p-[1px] opacity-0 shadow-[0_24px_90px_hsl(var(--primary)/0.12)]"
            >
              <div
                data-result-glow
                className="pointer-events-none absolute inset-x-10 top-4 h-24 rounded-full bg-primary/20 opacity-0 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative overflow-hidden rounded-[27px] bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] px-5 py-8 sm:px-10 sm:py-10">
                <div
                  data-result-glow
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 opacity-0 blur-2xl"
                  aria-hidden="true"
                />
                <div
                  data-result-emoji
                  className="mx-auto text-7xl leading-none opacity-0 drop-shadow-[0_0_34px_hsl(var(--primary)/0.34)] sm:text-8xl"
                  aria-hidden="true"
                >
                  {resultEmoji}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm font-semibold text-primary">
                  <span className="rounded-full bg-primary/[0.12] px-3 py-1">
                    {result.level.name}
                  </span>
                  <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
                    综合健康度 {result.health} 分
                  </span>
                </div>

                <h1 className="mx-auto mt-6 max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-normal text-slate-950 sm:text-6xl dark:text-slate-50">
                  {result.level.verdict}
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {result.level.description}
                </p>
              </div>
            </div>

            <div data-result-piece className="mt-10 flex flex-wrap justify-center gap-3 opacity-0">
              <Button className="gap-2" onClick={() => openFilecoinReceipt(answers, false)} type="button">
                <Database className="h-4 w-4" aria-hidden="true" />
                生成 Filecoin 收据
              </Button>
              <Button variant="outline" className="gap-2" onClick={restart} type="button">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                重新抽题
              </Button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-background text-foreground">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goPrevious}
        disabled={currentIndex === 0 || isTransitioning}
        aria-label="上一题"
        className="absolute bottom-4 left-[calc(50%-52px)] top-auto z-20 h-11 w-11 translate-y-0 rounded-2xl bg-background/90 backdrop-blur sm:bottom-auto sm:left-6 sm:top-1/2 sm:h-14 sm:w-14 sm:-translate-y-1/2 lg:left-10"
      >
        <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={goNext}
        disabled={isTransitioning}
        aria-label="下一题"
        className="absolute bottom-4 left-[calc(50%+8px)] right-auto top-auto z-20 h-11 w-11 translate-y-0 rounded-2xl bg-background/90 backdrop-blur sm:bottom-auto sm:left-auto sm:right-6 sm:top-1/2 sm:h-14 sm:w-14 sm:-translate-y-1/2 lg:right-10"
      >
        <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </Button>
      <section className="mx-auto flex h-screen max-w-[1680px] flex-col overflow-hidden bg-background px-5 pb-20 pt-4 sm:px-20 sm:py-7 lg:px-28">
        <TopBar
          current={currentIndex + 1}
          total={questions.length}
          answered={answeredCount}
          progress={progress}
          progressFillRef={progressFillRef}
          progressDotRef={progressDotRef}
        />

        <div
          ref={slideRef}
          className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col justify-start pb-4 pt-6 sm:justify-center sm:py-10 lg:py-12"
        >
          <div className="shrink-0 text-center">
            <p className="text-xs font-semibold text-primary sm:text-base">
              {currentQuestion.category}
            </p>
            <h1 className="mx-auto mt-3 max-w-4xl text-balance text-[28px] font-semibold leading-[1.08] tracking-normal text-slate-950 sm:mt-6 sm:text-5xl sm:leading-tight lg:text-[56px] dark:text-slate-50">
              {currentQuestion.text}
            </h1>
          </div>

          <div className="mx-auto mt-7 grid w-full max-w-4xl gap-3 sm:mt-10 sm:gap-4">
            {currentQuestion.options.map((option) => {
              const isSelected = selected?.id === option.id;
              return (
                <button
                  key={option.id}
                  ref={(node) => {
                    optionsRef.current[option.id] = node;
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  data-selected={isSelected}
                  onClick={() => chooseOption(option)}
                  onPointerMove={handleOptionPointerMove}
                  onPointerLeave={(event) => resetOptionTilt(event.currentTarget)}
                  onPointerCancel={(event) => resetOptionTilt(event.currentTarget)}
                  onBlur={(event) => resetOptionTilt(event.currentTarget)}
                  className={cn(
                    "option-card group relative w-full rounded-2xl p-[1px] text-left shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isSelected && "shadow-option",
                  )}
                >
                  <span
                    data-option-content
                    className="flex min-h-[76px] w-full items-center gap-4 rounded-[15px] bg-card px-4 py-3 sm:min-h-[108px] sm:gap-6 sm:px-7 sm:py-0"
                  >
                    <span
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors sm:h-12 sm:w-12 sm:text-base",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {option.id}
                    </span>
                    <span className="text-[15px] font-semibold leading-[1.45] text-slate-950 sm:text-lg sm:leading-7 dark:text-slate-50">
                      {option.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

        </div>
      </section>
    </main>
  );
}

function LandingPage({
  landingRef,
  mode,
  onConnect,
  onStart,
}: {
  landingRef: RefObject<HTMLDivElement | null>;
  mode: "connect" | "start";
  onConnect: () => void;
  onStart: () => void;
}) {
  const ctaLabel = mode === "connect" ? "连接钱包" : "开始检测";
  const CtaIcon = mode === "connect" ? Wallet : ArrowRight;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050a03] text-foreground">
      <div className="absolute inset-0 opacity-50" aria-hidden="true">
        <PlasmaWave
          colors={["#bef264", "#65a30d"]}
          speed1={0.034}
          speed2={0.052}
          focalLength={0.86}
          bend1={0.95}
          bend2={0.46}
          dir2={-1}
          rotationDeg={-4}
          xOffset={0}
          yOffset={0}
        />
      </div>
      <div className="absolute inset-0 bg-[#050a03]/76" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-1/2 h-[460px] -translate-y-1/2 bg-[#050a03]/68"
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-[#050a03]/38" aria-hidden="true" />

      <section
        ref={landingRef}
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16 text-center sm:px-10 lg:px-12"
      >
        <p
          data-landing-piece
          className="text-sm font-semibold uppercase tracking-[0.28em] text-primary opacity-0"
        >
          Company Reality Check
        </p>
        <h1
          data-landing-piece
          className="mt-8 w-full max-w-5xl text-[38px] font-semibold leading-[1.05] tracking-normal text-slate-50 opacity-0 [text-shadow:0_4px_28px_rgba(0,0,0,0.55)] sm:text-7xl lg:text-[96px]"
        >
          <Shuffle
            text="看看你的公司"
            tag="span"
            className="block"
            shuffleDirection="up"
            duration={0.42}
            stagger={0.018}
            shuffleTimes={2}
            scrambleCharset="草台牛马背锅开会PPTOKR"
            colorFrom="#a3e635"
            colorTo="#f8fafc"
          />
          <Shuffle
            text="是一个多大的草台班子"
            tag="span"
            className="block"
            shuffleDirection="up"
            duration={0.42}
            stagger={0.018}
            shuffleTimes={2}
            scrambleCharset="草台牛马背锅开会PPTOKR"
            colorFrom="#a3e635"
            colorTo="#f8fafc"
          />
        </h1>
        <p
          data-landing-piece
          className="mx-auto mt-8 w-full max-w-2xl text-lg leading-8 text-slate-50/90 opacity-0 [text-shadow:0_2px_16px_rgba(0,0,0,0.75)] sm:text-xl"
        >
          <span className="block sm:inline">从组织、决策、交付、风险等维度</span>
          <span className="block sm:inline">抽取 20 道题，完成后得到</span>
          <span className="block sm:inline">一份简洁的五级判断。</span>
        </p>
        <div data-landing-piece className="mt-10 flex justify-center opacity-0">
          <Button
            type="button"
            onClick={mode === "connect" ? onConnect : onStart}
            className="h-14 gap-3 rounded-2xl px-7 text-base font-semibold"
          >
            {ctaLabel}
            <CtaIcon className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </section>
    </main>
  );
}

function TopBar({
  current,
  total,
  answered,
  progress,
  progressFillRef,
  progressDotRef,
  showEstimate = true,
}: {
  current: number;
  total: number;
  answered: number;
  progress: number;
  progressFillRef?: RefObject<HTMLDivElement | null>;
  progressDotRef?: RefObject<HTMLDivElement | null>;
  showEstimate?: boolean;
}) {
  const fillStyle = { width: `${progress}%` };
  const dotStyle = { left: `${progress}%` };

  return (
    <header className="w-full shrink-0">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 sm:grid-cols-[1fr_auto_1fr] sm:gap-6">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="flex h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-primary/10 shadow-[0_0_24px_hsl(var(--primary)/0.14)] sm:h-12 sm:w-12">
            <img
              src={ctbzLogoUrl}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </span>
          <p className="text-lg font-semibold tracking-normal text-slate-950 sm:text-2xl dark:text-slate-50">
            草台班子
          </p>
        </div>

        <div className="self-start text-right text-xl font-semibold text-muted-foreground sm:self-center sm:text-center sm:text-2xl">
          <span className="text-primary">{String(current).padStart(2, "0")}</span>
          <span className="mx-1.5 sm:mx-2">/</span>
          <span>{total}</span>
        </div>

        <div
          className={cn(
            "hidden self-center text-right text-sm font-semibold text-muted-foreground sm:block",
            !showEstimate && "invisible",
          )}
        >
          已答 {answered} 题 · 预计用时 3-5分钟
        </div>

        {showEstimate ? (
          <p className="col-span-2 text-xs font-medium leading-5 text-muted-foreground sm:hidden">
            已答 {answered} 题 · 3-5分钟
          </p>
        ) : null}
      </div>

      <div className="relative mt-4 h-3 sm:mt-8 sm:h-4">
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-border" />
        <div
          ref={progressFillRef}
          className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 bg-primary"
          style={fillStyle}
        />
        <div
          ref={progressDotRef}
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]"
          style={dotStyle}
        />
      </div>
    </header>
  );
}

export default App;
