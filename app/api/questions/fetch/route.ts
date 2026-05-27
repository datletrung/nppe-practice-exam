import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CATEGORY_WEIGHTS: Record<string, number> = {
  PROFESSIONALISM: 8,
  ETHICS: 19,
  PROFESSIONAL_PRACTICE: 30,
  LAW_FOR_PROFESSIONAL_PRACTICE: 26,
  PROFESSIONAL_LAW: 8,
  DISCIPLINE_AND_REGULATION: 9,
};

function allocate(limit: number) {
  const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);

  const raw: Record<string, number> = {};
  const result: Record<string, number> = {};

  let used = 0;

  for (const [cat, weight] of Object.entries(CATEGORY_WEIGHTS)) {
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
  while (remainder > 0) {
    result[fractional[i % fractional.length].cat]++;
    remainder--;
    i++;
  }

  return result;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 110);

  try {
    const distribution = allocate(limit);

    const questions: any[] = [];

    for (const [category, count] of Object.entries(distribution)) {
      if (count <= 0) continue;

      const q = await prisma.$queryRaw<any[]>`
        SELECT *
        FROM "ExamQuestion"
        WHERE category = ${category}
        ORDER BY RANDOM()
        LIMIT ${count}
      `;

      questions.push(...q);
    }

    const shuffled = questions.sort(() => Math.random() - 0.5);

    return NextResponse.json({
      data: shuffled.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        answer: q.correctanswer ?? q.correctAnswer,
        category: q.category,
      })),
      count: shuffled.length,
      distribution,
    });
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