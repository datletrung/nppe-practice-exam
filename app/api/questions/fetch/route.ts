import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limit = Number(searchParams.get("limit") || 110);

  try {
    const questions = await prisma.$queryRaw<any[]>`
      SELECT *
      FROM "ExamQuestion"
      ORDER BY RANDOM()
      LIMIT ${limit}
    `;

    if (!questions.length) {
      return NextResponse.json(
        { error: "No questions found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        answer: q.correctanswer ?? q.correctAnswer,
        category: q.category,
      })),
      count: questions.length,
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