import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import "./Shuffle.css";

type ShuffleDirection = "left" | "right" | "up" | "down";
type ShuffleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

type ShuffleProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
  shuffleDirection?: ShuffleDirection;
  duration?: number;
  ease?: string;
  tag?: ShuffleTag;
  textAlign?: CSSProperties["textAlign"];
  shuffleTimes?: number;
  stagger?: number;
  scrambleCharset?: string;
  colorFrom?: string;
  colorTo?: string;
  respectReducedMotion?: boolean;
  triggerOnHover?: boolean;
};

function getScrambleChar(charset: string, index: number) {
  return charset[index % charset.length] ?? "";
}

function getStartVars(direction: ShuffleDirection, steps: number) {
  const offsetPercent = (steps / (steps + 1)) * 100;

  if (direction === "up") {
    return { yPercent: 0, xPercent: 0 };
  }

  if (direction === "down") {
    return { yPercent: -offsetPercent, xPercent: 0 };
  }

  if (direction === "left") {
    return { xPercent: 0, yPercent: 0 };
  }

  return { xPercent: -offsetPercent, yPercent: 0 };
}

function getEndVars(direction: ShuffleDirection, steps: number) {
  const offsetPercent = (steps / (steps + 1)) * 100;

  if (direction === "up") {
    return { yPercent: -offsetPercent, xPercent: 0 };
  }

  if (direction === "down") {
    return { yPercent: 0, xPercent: 0 };
  }

  if (direction === "left") {
    return { xPercent: -offsetPercent, yPercent: 0 };
  }

  return { xPercent: 0, yPercent: 0 };
}

export default function Shuffle({
  text,
  className = "",
  style,
  shuffleDirection = "right",
  duration = 0.35,
  ease = "power3.out",
  tag = "p",
  textAlign = "center",
  shuffleTimes = 1,
  stagger = 0.03,
  scrambleCharset = "",
  colorFrom,
  colorTo,
  respectReducedMotion = true,
  triggerOnHover = true,
}: ShuffleProps) {
  const ref = useRef<HTMLElement | null>(null);
  const steps = Math.max(1, Math.floor(shuffleTimes));
  const characters = useMemo(() => Array.from(text), [text]);
  const isVertical = shuffleDirection === "up" || shuffleDirection === "down";
  const Tag = tag;

  useEffect(() => {
    const root = ref.current;
    if (!root) {
      return;
    }

    const reduceMotion =
      respectReducedMotion &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const strips = Array.from(root.querySelectorAll<HTMLElement>("[data-shuffle-strip]"));
    const startVars = getStartVars(shuffleDirection, steps);
    const endVars = getEndVars(shuffleDirection, steps);

    if (reduceMotion) {
      gsap.set(strips, { ...endVars, clearProps: "willChange" });
      return;
    }

    const play = () => {
      gsap.killTweensOf(strips);
      gsap.set(strips, {
        ...startVars,
        color: colorFrom,
        force3D: true,
        willChange: "transform",
      });
      gsap.to(strips, {
        ...endVars,
        color: colorTo,
        duration,
        ease,
        stagger,
        force3D: true,
        onComplete: () => gsap.set(strips, { clearProps: "willChange" }),
      });
    };

    play();

    if (!triggerOnHover) {
      return () => gsap.killTweensOf(strips);
    }

    root.addEventListener("mouseenter", play);

    return () => {
      root.removeEventListener("mouseenter", play);
      gsap.killTweensOf(strips);
    };
  }, [
    colorFrom,
    colorTo,
    duration,
    ease,
    respectReducedMotion,
    shuffleDirection,
    stagger,
    steps,
    text,
    triggerOnHover,
  ]);

  return (
    <Tag
      ref={ref as never}
      aria-label={text}
      className={`shuffle-parent ${className}`}
      style={{ textAlign, ...style }}
    >
      {characters.map((char, charIndex) => {
        const displayChar = char === " " ? "\u00A0" : char;
        const scrambled = Array.from({ length: steps }, (_, stepIndex) =>
          scrambleCharset ? getScrambleChar(scrambleCharset, charIndex + stepIndex) : displayChar,
        );
        const stripChars =
          shuffleDirection === "down" || shuffleDirection === "right"
            ? [displayChar, ...scrambled]
            : [...scrambled, displayChar];

        return (
          <span
            key={`${char}-${charIndex}`}
            className="shuffle-char-wrapper"
            data-space={char === " "}
            aria-hidden="true"
          >
            <span
              className={isVertical ? "shuffle-strip shuffle-strip-vertical" : "shuffle-strip"}
              data-shuffle-strip
            >
              {stripChars.map((stripChar, stripIndex) => (
                <span
                  key={`${stripChar}-${stripIndex}`}
                  className="shuffle-char"
                >
                  {stripChar}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}
