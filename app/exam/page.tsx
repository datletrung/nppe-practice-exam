"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag } from "@fortawesome/free-regular-svg-icons";
import {
  faBookOpen,
  faChevronLeft,
  faMinus,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import Loading from "@/components/loading-icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TOTAL_TIME_FULL_EXAM = 60 * 150; // 2.5 hours
const TOTAL_QUESTIONS_FULL_EXAM = 100;
const TOTAL_TIME_SHORT_EXAM = 60 * 60; // 1 hour
const TOTAL_QUESTIONS_SHORT_EXAM = 35;

const MIN_CUSTOM_QUESTIONS_PER_CATEGORY = 0;
const MIN_TIMER_MINUTES = 15;
const MAX_TIMER_MINUTES = 180;

type Category =
  | "PROFESSIONALISM"
  | "ETHICS"
  | "PROFESSIONAL_PRACTICE"
  | "LAW_FOR_PROFESSIONAL_PRACTICE"
  | "PROFESSIONAL_LAW"
  | "DISCIPLINE_AND_REGULATION";

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "PROFESSIONALISM", label: "Professionalism" },
  { key: "ETHICS", label: "Ethics" },
  { key: "PROFESSIONAL_PRACTICE", label: "Professional Practice" },
  { key: "LAW_FOR_PROFESSIONAL_PRACTICE", label: "Law for Professional Practice" },
  { key: "PROFESSIONAL_LAW", label: "Professional Law" },
  { key: "DISCIPLINE_AND_REGULATION", label: "Discipline & Regulation" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c.label])
);

type Question = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  category: string;
};

type ShuffledQuestion = Question & {
  shuffled: {
    opt: string;
    originalIdx: number;
  }[];
};

type CategoryStats = {
  category: string;
  total: number;
  correct: number;
  percent: number;
};

type ExamMode = "full" | "quick" | "custom";
type Phase = "setup" | "loading" | "exam";

export default function Page() {
  const router = useRouter();

  // ---- overall flow ----
  const [phase, setPhase] = useState<Phase>("setup");
  const [selectedMode, setSelectedMode] = useState<ExamMode>("full");

  // ---- custom practice setup ----
  const [customCounts, setCustomCounts] = useState<Record<Category, number>>(
    () =>
      Object.fromEntries(CATEGORIES.map((c) => [c.key, 0])) as Record<
        Category,
        number
      >
  );
  const [categoryMaxes, setCategoryMaxes] = useState<Record<Category, number>>(
    () =>
      Object.fromEntries(
        CATEGORIES.map((c) => [c.key, 0])
      ) as Record<Category, number>
  );
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(60);

  const customTotal = Object.values(customCounts).reduce((a, b) => a + b, 0);

  // ---- exam state ----
  const [submitted, setSubmitted] = useState(false);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  // totalTime === null means "no timer" (stopwatch counts up instead)
  const [timeLeft, setTimeLeft] = useState<number | null>(TOTAL_TIME_FULL_EXAM);
  const [totalTime, setTotalTime] = useState<number | null>(TOTAL_TIME_FULL_EXAM);
  const [timeTaken, setTimeTaken] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoSubmitted = useRef(false);

  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progress = totalCount ? (answeredCount / totalCount) * 100 : 0;

  const breakdown = categoryBreakdown();

  function printReview() {
    window.print();
  }

  // ---------------------------------------------------------------------
  // Fetching
  // ---------------------------------------------------------------------

  async function fetchQuestions(body: Record<string, unknown>) {
    const res = await fetch(`/api/questions/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res.json();
  }

  function applyShuffle(raw: Question[], shuffleOpts: boolean): ShuffledQuestion[] {
    return raw.map((q) => {
      const shuffledOptions = q.options.map((opt, idx) => ({
        opt,
        originalIdx: idx,
      }));

      if (shuffleOpts) {
        shuffledOptions.sort(() => Math.random() - 0.5);
      }

      return { ...q, shuffled: shuffledOptions };
    });
  }

  async function startExam(
    mode: ExamMode,
    opts?: {
      counts?: Record<Category, number>;
      shuffleQ?: boolean;
      shuffleA?: boolean;
      timerSeconds?: number | null;
    }
  ) {
    setPhase("loading");

    let limit = TOTAL_QUESTIONS_FULL_EXAM;
    let seconds: number | null = TOTAL_TIME_FULL_EXAM;
    let requestBody: Record<string, unknown> = { shuffle: true };
    let shuffleQ = true;
    let shuffleA = true;

    if (mode === "full") {
      limit = TOTAL_QUESTIONS_FULL_EXAM;
      seconds = TOTAL_TIME_FULL_EXAM;
      requestBody = { limit, shuffle: true };
    } else if (mode === "quick") {
      limit = TOTAL_QUESTIONS_SHORT_EXAM;
      seconds = TOTAL_TIME_SHORT_EXAM;
      requestBody = { limit, shuffle: true };
    } else {
      const counts = opts?.counts ?? customCounts;
      limit = Object.values(counts).reduce((a, b) => a + b, 0);
      seconds = opts?.timerSeconds ?? null;
      shuffleQ = opts?.shuffleQ!;
      shuffleA = opts?.shuffleA!;
      requestBody = { counts, shuffle: shuffleQ };
    }

    try {
      const data = await fetchQuestions(requestBody);

      if (!data.data || data.data.length === 0) {
        setPhase("setup");
        return;
      }

      let shuffled = applyShuffle(data.data, shuffleA);

      if (mode === "custom" && shuffleQ) {
        shuffled = shuffled.sort(() => Math.random() - 0.5);
      }

      setQuestions(shuffled);
      setAnswers({});
      setFlags({});
      setSubmitted(false);
      setShowModal(false);
      hasAutoSubmitted.current = false;

      setTotalTime(seconds);
      setTimeLeft(seconds);
      setTimeTaken(0);
      startTimeRef.current = Date.now();

      setPhase("exam");
    } catch (err) {
      console.error("Failed to load questions", err);
      setPhase("setup");
    }
  }

  // Countdown / stopwatch ticker
  useEffect(() => {
    if (phase !== "exam" || submitted) return;

    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s === null) return null; // no timer configured
        if (s <= 1) return 0;
        return s - 1;
      });

      if (startTimeRef.current) {
        setTimeTaken(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);

    return () => clearInterval(t);
  }, [phase, submitted]);

  // Auto-submit when countdown hits zero
  useEffect(() => {
    if (phase !== "exam" || submitted) return;

    if (timeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      setSubmitted(true);
      setShowModal(true);
      if (startTimeRef.current) {
        setTimeTaken(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }
  }, [timeLeft, phase, submitted]);

  useEffect(() => {
    async function loadCategoryCounts() {
      try {
        const res = await fetch("/api/questions/count");
        const data = await res.json();

        setCategoryMaxes(
          Object.fromEntries(
            CATEGORIES.map((c) => [
              c.key,
              data.data?.[c.key] ?? 0,
            ])
          ) as Record<Category, number>
        );
      } catch (err) {
        console.error(err);
      }
    }

    loadCategoryCounts();
  }, []);

  function select(qid: string, idx: number) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  }

  function toggleFlag(qid: string) {
    if (submitted) return;
    setFlags((prev) => ({ ...prev, [qid]: !prev[qid] }));
  }

  function score() {
    let correct = 0;

    questions.forEach((q) => {
      const selected = answers[q.id];
      if (selected === undefined) return;
      if (selected === q.answer) correct++;
    });

    return correct;
  }

  function categoryBreakdown(): CategoryStats[] {
    const map: Record<string, { total: number; correct: number }> = {};

    questions.forEach((q) => {
      const cat = q.category;

      if (!map[cat]) {
        map[cat] = { total: 0, correct: 0 };
      }

      map[cat].total += 1;

      const selected = answers[q.id];

      if (selected === q.answer) {
        map[cat].correct += 1;
      }
    });

    return Object.entries(map).map(([category, v]) => ({
      category,
      total: v.total,
      correct: v.correct,
      percent: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }));
  }

  function submit() {
    setSubmitted(true);
    setShowModal(true);
  }

  function backToSetup() {
    setPhase("setup");
    router.push("/exam");
  }

  function formatTime(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;

    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    const ss = s.toString().padStart(2, "0");

    return `${hh}:${mm}:${ss}`;
  }

  function goTo(qid: string) {
    refs.current[qid]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function updateCustomCount(cat: Category, delta: number) {
    setCustomCounts((prev) => ({
      ...prev,
      [cat]: Math.min(
        categoryMaxes[cat],
        Math.max(MIN_CUSTOM_QUESTIONS_PER_CATEGORY, prev[cat] + delta)
      ),
    }));
  }

  function setCustomCountDirect(cat: Category, value: number) {
    if (Number.isNaN(value)) value = 0;
    setCustomCounts((prev) => ({
      ...prev,
      [cat]: Math.min(
        categoryMaxes[cat],
        Math.max(MIN_CUSTOM_QUESTIONS_PER_CATEGORY, value)
      ),
    }));
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 992) {
        setShowSidebar(false);
      } else {
        setShowSidebar(true);
      }
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (showSidebar && window.innerWidth <= 992 && phase === "exam") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidebar, phase]);

  // -----------------------------------------------------------------------
  // LOADING
  // -----------------------------------------------------------------------
  if (phase === "loading") {
    return (
      <div className="h-screen flex flex-col gap-4 items-center justify-center">
        <Loading size="base" />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // SETUP SCREEN
  // -----------------------------------------------------------------------
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto p-6">
          <nav className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm mb-6">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-black hover:underline transition"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
              Back to Home
            </Link>

            <span className="text-center text-lg font-semibold text-gray-900">
              NPPE Practice
            </span>

            <div className="w-24" />
          </nav>

          <div className="space-y-4">
            {/* FULL EXAM */}
            <button
              onClick={() => setSelectedMode("full")}
              className={`w-full text-left rounded-xl border p-5 transition cursor-pointer ${
                selectedMode === "full"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold text-gray-900">Full Exam</div>
              <div className="text-sm text-gray-600 mt-1">
                {TOTAL_QUESTIONS_FULL_EXAM}{" "}Questions &middot; 2 hours 30 minutes
              </div>
            </button>

            {/* QUICK EXAM */}
            <button
              onClick={() => setSelectedMode("quick")}
              className={`w-full text-left rounded-xl border p-5 transition cursor-pointer ${
                selectedMode === "quick"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="font-semibold text-gray-900">Quick Exam</div>
              <div className="text-sm text-gray-600 mt-1">
                {TOTAL_QUESTIONS_SHORT_EXAM}{" "}Questions &middot; 1 hour
              </div>
            </button>

            {/* CUSTOM PRACTICE */}
            <div
              className={`rounded-xl border transition ${
                selectedMode === "custom"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <button
                onClick={() => setSelectedMode("custom")}
                className="w-full text-left p-5 cursor-pointer"
              >
                <div className="font-semibold text-gray-900">
                  Custom Practice
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Choose your own topics, question count, and timer
                </div>
              </button>

              {selectedMode === "custom" && (
                <div className="px-5 pb-5 space-y-6 border-t border-green-200 pt-5">
                  {/* TOPIC STEPPERS */}
                  <div>
                    <div className="text-sm font-semibold text-gray-700 mb-3">
                      Topics
                    </div>

                    <div className="space-y-4">
                      {CATEGORIES.map((c) => (
                        <div
                          key={c.key}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="text-sm text-gray-700 font-medium">
                            {c.label}
                          </span>

                          <div className="flex items-center gap-4 flex-1 max-w-md">
                            <input
                              type="range"
                              min={0}
                              max={categoryMaxes[c.key]}
                              value={customCounts[c.key]}
                              onChange={(e) =>
                                setCustomCountDirect(c.key, Number(e.target.value))
                              }
                              style={{
                                background: `linear-gradient(
                                  to right,
                                  #16a34a 0%,
                                  #16a34a ${(customCounts[c.key] / categoryMaxes[c.key]) * 100}%,
                                  #d1d5db ${(customCounts[c.key] / categoryMaxes[c.key]) * 100}%,
                                  #d1d5db 100%
                                )`,
                              }}
                              className="flex-1 slider"
                            />

                            <div className="flex items-center gap-1 text-sm">
                              <input
                                type="number"
                                min={0}
                                max={categoryMaxes[c.key]}
                                value={customCounts[c.key]}
                                onChange={(e) =>
                                  setCustomCountDirect(c.key, Number(e.target.value))
                                }
                                className="w-10 text-center rounded-md border border-gray-300 bg-white py-1 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                              />

                              <span className="text-gray-500 whitespace-nowrap">
                                / 
                                <span className="inline-block w-8 text-left">
                                  {categoryMaxes[c.key]}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">
                        Total Questions
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {customTotal}
                      </span>
                    </div>
                  </div>

                  {/* SHUFFLE OPTIONS */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={timerEnabled}
                        onChange={(e) => setTimerEnabled(e.target.checked)}
                      />
                      Timer
                    </label>
                  </div>

                  {/* TIMER SLIDER */}
                  {timerEnabled && (
                    <div>
                      <div className="flex items-center justify-between text-sm text-gray-700 mb-1">
                        <span>Minutes</span>
                        <span className="font-semibold">{timerMinutes}</span>
                      </div>

                      <input
                        type="range"
                        min={MIN_TIMER_MINUTES}
                        max={MAX_TIMER_MINUTES}
                        step={5}
                        value={timerMinutes}
                        onChange={(e) =>
                          setTimerMinutes(parseInt(e.target.value, 10))
                        }
                        style={{
                          background: `linear-gradient(
                            to right,
                            #16a34a 0%,
                            #16a34a ${(timerMinutes-MIN_TIMER_MINUTES) / (MAX_TIMER_MINUTES-MIN_TIMER_MINUTES) * 100}%,
                            #d1d5db ${(timerMinutes-MIN_TIMER_MINUTES) / (MAX_TIMER_MINUTES-MIN_TIMER_MINUTES) * 100}%,
                            #d1d5db 100%
                          )`,
                        }}
                        className="w-full slider"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* START BUTTON */}
            <button
              onClick={() => {
                if (selectedMode === "custom") {
                  if (customTotal <= 0) return;
                  startExam("custom", {
                    counts: customCounts,
                    timerSeconds: timerEnabled ? timerMinutes * 60 : null,
                  });
                } else {
                  startExam(selectedMode);
                }
              }}
              disabled={selectedMode === "custom" && customTotal <= 0}
              className="w-full py-4 flex items-center justify-center bg-green-700 text-white rounded-lg shadow hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-semibold"
            >
              {selectedMode === "custom"
                ? customTotal > 0
                  ? `Start Practice (${customTotal} Questions)`
                  : "Choose at least 1 question"
                : "Start Exam"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // EXAM SCREEN
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 pb-0">
        <nav className="flex flex-col sm:flex-row items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-black hover:underline transition"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
            Back to Home
          </Link>

          <span className="text-center text-lg font-semibold text-gray-900">
            NPPE Practice Exam
          </span>

          <div className="w-24" />
        </nav>
      </div>

      <div className="max-w-7xl mx-auto p-6 pt-6">
        <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl">
          {/* MOBILE BACKDROP */}
          {showSidebar && (
            <div
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setShowSidebar(false)}
            />
          )}

          {/* TOGGLE BUTTON (when closed) */}
          {!showSidebar && (
            <div
              onClick={() => setShowSidebar(true)}
              className="fixed lg:hidden top-6 left-0 w-12 h-12 z-50 flex items-center justify-center cursor-pointer rounded-r-md shadow-md border border-gray-200 bg-white"
            >
              <FontAwesomeIcon icon={faBookOpen} />
            </div>
          )}

          {/* SIDEBAR */}
          <div
            className={`
              fixed lg:relative z-50
              top-0 left-0
              h-full
              w-[85%] max-w-96
              bg-white
              transition-transform duration-200
              ${showSidebar ? "translate-x-0" : "-translate-x-full"}
            `}
          >
            <div className="relative h-full flex flex-col justify-between p-4 space-y-4 overflow-y-auto lg:overflow-visible">
              <div
                onClick={() => setShowSidebar(false)}
                className={`lg:hidden left-0 top-3 w-12 h-12 flex items-center justify-center cursor-pointer rounded-r-md shadow-md border border-gray-200
                  ${!showSidebar ? "hidden" : "absolute"}
                `}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </div>

              <div className="flex flex-col space-y-4 flex-1 overflow-y-auto">
                {/* TIMER */}
                <div className="text-center">
                  <div className="text-sm text-gray-500">
                    {totalTime === null ? "Time Elapsed" : "Time Left"}
                  </div>

                  <div
                    className={`text-xl font-bold transition-colors duration-100 ${
                      totalTime === null
                        ? "text-gray-700"
                        : timeLeft === 0
                        ? "text-red-600"
                        : (timeLeft ?? 0) <= 600
                        ? "text-red-500 animate-pulse"
                        : "text-green-700"
                    }`}
                  >
                    {totalTime === null
                      ? formatTime(timeTaken)
                      : formatTime(timeLeft ?? 0)}
                  </div>
                </div>

                {/* PROGRESS BAR */}
                <div className="">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* GRID */}
                <div className="grid grid-cols-4 xl:grid-cols-5 gap-2 overflow-y-auto">
                  {questions.map((q, i) => {
                    const answered = answers[q.id] !== undefined;
                    const flagged = flags[q.id];
                    const userAns = answers[q.id];
                    const correct = q.answer;

                    const base =
                      "w-10 h-10 rounded-md border text-xs font-semibold cursor-pointer transition flex items-center justify-center";

                    const stateClass = !submitted
                      ? flagged
                        ? "bg-yellow-50 border-yellow-500"
                        : answered
                        ? "bg-blue-50 border-blue-500"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                      : userAns === correct
                      ? "bg-green-300 border-green-600 text-green-800"
                      : userAns !== undefined
                      ? "bg-red-300 border-red-600 text-red-800"
                      : "bg-gray-100 border-gray-300 text-gray-500";

                    return (
                      <button
                        key={q.id}
                        onClick={() => goTo(q.id)}
                        className={`${base} ${stateClass}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-4 border-t">
                {!submitted ? (
                  <button
                    onClick={submit}
                    className="w-full py-4 h-10 flex items-center justify-center bg-green-700 text-white rounded-lg shadow hover:bg-green-800 cursor-pointer"
                  >
                    Submit Exam
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={backToSetup}
                      className="w-full py-4 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer"
                    >
                      New Exam
                    </button>
                    <button
                      onClick={printReview}
                      className="w-full py-4 h-10 flex items-center justify-center bg-gray-800 text-white rounded-lg hover:bg-gray-900 cursor-pointer"
                    >
                      Print Review
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT */}
          <div id="print-area" className="flex-1 h-full overflow-y-auto p-3 space-y-6">
            <h1 className="text-2xl font-bold mb-4">NPPE Practice Exam</h1>

            {/* PRINT SUMMARY (ONLY IN PRINT) */}
            <div className="hidden print:block">
              <h2 className="text-lg font-bold mb-2">Category Breakdown</h2>

              <div className="space-y-2 text-sm">
                {breakdown.map((c) => (
                  <div key={c.category} className="border p-2 rounded">
                    <div className="flex justify-between">
                      <span className="font-semibold">
                        {CATEGORY_LABELS[c.category] ?? c.category}
                      </span>
                      <span>
                        {c.correct}/{c.total}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600">
                      {c.percent}% correct
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const correct = q.answer;

              return (
                <div
                  key={q.id}
                  ref={(el) => (refs.current[q.id] = el as any)}
                  className="bg-white p-5 rounded-xl border border-gray-200"
                >
                  {/* HEADER */}
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 font-semibold">
                      {i + 1}. {q.question}
                    </div>

                    {/* FLAG */}
                    <button
                      onClick={() => toggleFlag(q.id)}
                      className={`text-sm w-8 h-8 rounded-md border 
                        ${!submitted ? "cursor-pointer" : ""}
                        ${
                          flags[q.id]
                            ? "bg-yellow-100 border-yellow-500 text-yellow-700"
                            : "border-gray-200 hover:bg-gray-50"
                        }
                      `}
                    >
                      <FontAwesomeIcon icon={faFlag} />
                    </button>
                  </div>

                  {/* OPTIONS */}
                  <div className="space-y-2">
                    {q.shuffled.map((opt, idx) => {
                      const originalIdx = opt.originalIdx;

                      let className = "flex items-center gap-2 p-2 rounded-md border";

                      if (!submitted) {
                        className +=
                          userAns === originalIdx
                            ? " bg-blue-50 border-blue-500 cursor-pointer"
                            : " border-gray-100 hover:bg-gray-50 cursor-pointer";
                      } else {
                        if (originalIdx === correct) {
                          className += " bg-green-50 border-green-600 text-green-700";
                        } else if (userAns === originalIdx && userAns !== correct) {
                          className += " bg-red-50 border-red-500 text-red-600";
                        } else {
                          className += " border-gray-100 text-gray-400";
                        }
                      }

                      return (
                        <label key={idx} className={className}>
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === originalIdx}
                            onChange={() => select(q.id, originalIdx)}
                            disabled={submitted}
                          />
                          {opt.opt}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!submitted ? (
              <button
                onClick={submit}
                className="lg:hidden w-full py-4 h-10 flex items-center justify-center bg-green-700 text-white rounded-lg shadow hover:bg-green-800 cursor-pointer"
              >
                Submit Exam
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={backToSetup}
                  className="lg:hidden w-full py-4 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer"
                >
                  New Exam
                </button>
                <button
                  onClick={printReview}
                  className="w-full py-4 h-10 flex items-center justify-center bg-gray-800 text-white rounded-lg hover:bg-gray-900 cursor-pointer"
                >
                  Print Review
                </button>
              </div>
            )}
          </div>

          {/* MODAL */}
          {showModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center">
                <h2 className="text-xl font-bold mb-4">Exam Completed</h2>

                {/* OVERALL SCORE */}
                <div className="text-lg mb-2">
                  Score: {score()} / {questions.length}
                </div>

                <div className="text-sm text-gray-600 mb-4">
                  Time Taken: {formatTime(timeTaken)}
                  {totalTime !== null ? ` / ${formatTime(totalTime)}` : ""}
                </div>

                {/* CATEGORY BREAKDOWN */}
                <div className="text-left space-y-2 mb-4">
                  <div className="font-semibold text-sm text-gray-700">
                    Category Breakdown
                  </div>

                  {breakdown.map((c) => (
                    <div key={c.category} className="border rounded-md p-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-bold">
                          {CATEGORY_LABELS[c.category] ?? c.category}
                        </span>
                        <span>
                          {c.correct}/{c.total}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500">
                        {c.percent}% correct
                      </div>

                      <div className="w-full h-2 bg-gray-100 rounded mt-1">
                        <div
                          className="h-2 bg-blue-600 rounded"
                          style={{ width: `${c.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                >
                  Review
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}