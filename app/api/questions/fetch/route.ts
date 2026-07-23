import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Official exam blueprint weighting — used for Full/Quick exams, and as the
// fallback default whenever a request doesn't specify its own counts/weights.
const CATEGORY_WEIGHTS: Record<string, number> = {
  PROFESSIONALISM: 8,
  ETHICS: 19,
  PROFESSIONAL_PRACTICE: 30,
  LAW_FOR_PROFESSIONAL_PRACTICE: 26,
  PROFESSIONAL_LAW: 8,
  DISCIPLINE_AND_REGULATION: 9,
};

/**
 * Proportionally splits `limit` across `weights` using largest-remainder
 * rounding, so the counts always sum to exactly `limit` (plain Math.floor
 * allocation can fall a few questions short after rounding down).
 */
function allocate(
  limit: number,
  weights: Record<string, number> = CATEGORY_WEIGHTS
) {
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  if (totalWeight <= 0) {
    return Object.fromEntries(Object.keys(weights).map((cat) => [cat, 0]));
  }

  const raw: Record<string, number> = {};
  const result: Record<string, number> = {};

  let used = 0;

  for (const [cat, weight] of Object.entries(weights)) {
    const val = (weight / totalWeight) * limit;
    raw[cat] = val;
    result[cat] = Math.floor(val);
    used += result[cat];
  }

  let remainder = limit - used;

  const fractional = Object.entries(raw)
    .map(([cat, val]) => ({
      cat,
      frac: val - Math.floor(val),
    }))
    .sort((a, b) => b.frac - a.frac);

  let i = 0;
  while (remainder > 0 && fractional.length > 0) {
    result[fractional[i % fractional.length].cat]++;
    remainder--;
    i++;
  }

  return result;
}

async function fetchCategory(category: string, count: number) {
  if (count <= 0) return [];

  return prisma.$queryRaw<any[]>`
    SELECT *
    FROM "ExamQuestion"
    WHERE category = ${category}
    ORDER BY RANDOM()
    LIMIT ${count}
  `;
}

type FetchOptions = {
  limit: number;
  counts?: Record<string, number>;
  weights?: Record<string, number>;
  shuffle?: boolean;
};

async function loadQuestions({ limit, counts, weights, shuffle = true }: FetchOptions) {
  let distribution: Record<string, number>;

  if (counts && Object.keys(counts).length > 0) {
    // Exact per-category counts from Custom Practice's steppers — used as-is,
    // no proportional rounding needed since the user already picked exact
    // numbers per topic.
    distribution = Object.fromEntries(
      Object.keys(CATEGORY_WEIGHTS).map((cat) => [cat, Number(counts[cat]) || 0])
    );
  } else if (weights && Object.keys(weights).length > 0) {
    // Custom relative weights — proportionally allocated across `limit`.
    distribution = allocate(limit, weights);
  } else {
    // Full / Quick exam — official blueprint weighting (unchanged behavior).
    distribution = allocate(limit);
  }

  const questions: any[] = [];

  for (const [category, count] of Object.entries(distribution)) {
    if (count <= 0) continue;

    const q = await fetchCategory(category, count);
    questions.push(...q);
  }

  const finalQuestions = shuffle
    ? questions.sort(() => Math.random() - 0.5)
    : questions;

  return {
    data: finalQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.correctanswer ?? q.correctAnswer,
      category: q.category,
    })),
    count: finalQuestions.length,
    distribution,
  };
}

// New: Full/Quick/Custom all go through POST now, so Custom Practice can pass
// per-category `counts` (or `weights`) in the request body instead of being
// stuck with the fixed blueprint distribution.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const limit = Number(body.limit) || 100;
    const shuffle = body.shuffle ?? true;

    const result = await loadQuestions({
      limit,
      counts: body.counts,
      weights: body.weights,
      shuffle,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch questions",
        details: err.message,
      },
      { status: 500 }
    );
  }
}

// Kept for backward compatibility with any existing GET-based callers
// (e.g. old bookmarked links straight to the API). Only supports the
// default blueprint distribution — Custom Practice requires POST.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 100);

  try {
    const result = await loadQuestions({ limit, shuffle: true });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch questions",
        details: err.message,
      },
      { status: 500 }
    );
  }
}