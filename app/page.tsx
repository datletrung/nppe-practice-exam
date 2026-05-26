"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFlag } from "@fortawesome/free-regular-svg-icons";
import { faBookOpen, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import Loading from "@/components/loading-icon";
import Link from "next/link";

const TOTAL_TIME = 60 * 150; // 2.5 hours
const TOTAL_QUESTIONS = 110;

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

export default function Page() {
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  const totalTime = TOTAL_TIME;
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasAutoSubmitted = useRef(false);

  const CATEGORY_LABELS: Record<string, string> = {
    PROFESSIONALISM: "Professionalism",
    ETHICS: "Ethics",
    PROFESSIONAL_PRACTICE: "Professional Practice",
    LAW_FOR_PROFESSIONAL_PRACTICE: "Law for Professional Practice",
    PROFESSIONAL_LAW: "Professional Law",
    DISCIPLINE_AND_REGULATION: "Regulation & Discipline",
  };

  async function loadQuestions() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/questions/fetch?limit=${TOTAL_QUESTIONS}`
      );

      const data = await res.json();

      if (!data.data) {
        setLoading(false);
        return;
      }

      const shuffled: ShuffledQuestion[] = data.data.map((q: Question) => {
        const shuffledOptions = q.options
          .map((opt, idx) => ({
            opt,
            originalIdx: idx,
          }))
          .sort(() => Math.random() - 0.5);

        return {
          ...q,
          shuffled: shuffledOptions,
        };
      });

      setQuestions(shuffled);
      setTimeLeft(TOTAL_TIME);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!started || submitted) return;
    if (questions.length === 0) return; // IMPORTANT: wait for load

    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [started, submitted, questions.length]);

  useEffect(() => {
    if (!started || submitted) return;

    if (timeLeft === 0 && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      setSubmitted(true);
      setShowModal(true);
    }
  }, [timeLeft, started, submitted]);

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
      const correctOriginal = q.answer;

      const selectedOriginal =
        q.shuffled.find((o: any) => o.originalIdx === selected)?.originalIdx;

      if (selected === undefined) return;
      if (selected === undefined) return;

      if (selected === undefined) return;

      // compare original index
      if (selected === correctOriginal) correct++;
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

  function newExam() {
    loadQuestions();
    
    setStarted(false);
    setSubmitted(false);
    setAnswers({});
    setFlags({});
    setTimeLeft(TOTAL_TIME);
    setShowModal(false);

    hasAutoSubmitted.current = false;
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

  const timeTaken = totalTime - timeLeft;

  function goTo(qid: string) {
    refs.current[qid]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
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
    if (showSidebar && window.innerWidth <= 992) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [showSidebar]);

  if (started && loading) {
    return (
      <div className="h-screen flex flex-col gap-4 items-center justify-center">
        <Loading size="base" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-3xl w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center space-y-4">


          <h1 className="text-2xl font-bold">
            NPPE Practice Exam
          </h1>

          <p className="text-gray-600 text-sm leading-relaxed">
            This practice exam is designed to reflect the general format and subject areas covered in the National Professional Practice Examination (NPPE), including engineering ethics, professional responsibility, law, and regulatory practice in Canada.
          </p>

          <div className="text-left text-sm text-gray-700 space-y-1">
            <p>• 2.5-hour timed session</p>
            <p>• Multiple-choice questions</p>
            <p>• Flag questions for review</p>
            <p>• Instant scoring after submission</p>
            <p>• Full review with correct answers</p>
          </div>

          <div className="pt-2 text-xs text-gray-500">
            Tip: Focus on ethical reasoning rather than memorization.
          </div>

          <div className="flex flex-col items-center jsutify-center gap-2">
            <button
              onClick={async () => {
                setStarted(true);
                await loadQuestions();
              }}
              className="w-full mt-4 py-4 h-10 flex items-center justify-center bg-green-700 text-white rounded-lg shadow hover:bg-green-800 cursor-pointer"
            >
              Start Exam
            </button>

            <Link
              href="/questions"
              className="w-full py-4 h-10 flex items-center justify-center border border-green-700 text-green-700 rounded-lg shadow hover:bg-green-200 cursor-pointer"
            >
              Question Bank
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
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
          w-[85%] max-w-96 lg:w-96
          bg-white
          transition-transform duration-200
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="relative h-full lg:h-[calc(100vh-2rem)] flex flex-col justify-between p-4 space-y-4 overflow-y-auto lg:overflow-visible">
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
            <div className="text-center border-b pb-3">
              <div className="text-sm text-gray-500">Time Left</div>

              <div
                className={`text-xl font-bold transition-colors duration-100 ${
                  timeLeft === 0
                    ? "text-red-600"
                    : timeLeft <= 600
                    ? "text-red-500 animate-pulse"
                    : "text-green-700"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-4 xl:grid-cols-5 gap-2 h-[calc(100vh-16rem)] overflow-y-auto">
              {questions.map((q, i) => {
                const answered = answers[q.id] !== undefined;
                const flagged = flags[q.id];
                const userAns = answers[q.id];
                const correct = q.answer;

                const base =
                  "w-10 h-10 rounded-md border text-xs font-semibold cursor-pointer transition flex items-center justify-center";

                const stateClass = !submitted
                  ? flagged
                    ? "bg-yellow-200 border-yellow-500"
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
              <button
                onClick={newExam}
                className="w-full py-4 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer"
              >
                New Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 h-screen overflow-y-auto p-3 space-y-6">
        <h1 className="text-2xl font-bold mb-4">NPPE Practice Exam</h1>

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
                    ${flags[q.id]
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
                  const correct = q.answer;

                  let className =
                    "flex items-center gap-2 p-2 rounded-md border";

                  if (!submitted) {
                    className +=
                      userAns === originalIdx
                        ? " bg-blue-50 border-blue-500 cursor-pointer"
                        : " border-gray-100 hover:bg-gray-50 cursor-pointer";
                  } else {
                    if (originalIdx === correct) {
                      className +=
                        " bg-green-50 border-green-600 text-green-700";
                    } else if (userAns === originalIdx && userAns !== correct) {
                      className +=
                        " bg-red-50 border-red-500 text-red-600";
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
          <button
            onClick={newExam}
            className="lg:hidden w-full py-4 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 cursor-pointer"
          >
            New Exam
          </button>
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
              Time Taken: {formatTime(timeTaken)} / {formatTime(totalTime)}
            </div>

            {/* CATEGORY BREAKDOWN */}
            <div className="text-left space-y-2 mb-4">
              <div className="font-semibold text-sm text-gray-700">
                Category Breakdown
              </div>

              {categoryBreakdown().map((c) => (
                <div
                  key={c.category}
                  className="border rounded-md p-2 text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-bold">{CATEGORY_LABELS[c.category] ?? c.category}</span>
                    <span>{c.correct}/{c.total}</span>
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
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
            >
              Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}