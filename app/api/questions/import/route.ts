import { NextResponse } from "next/server";
import type { ExamCategory } from "@prisma/client";
import prisma from "@/lib/prisma";

type IncomingQuestion = {
  question: string;
  options: string[];
  answer: number;
  category: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const questions: IncomingQuestion[] = body.questions;

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "Invalid payload: questions must be a non-empty array" },
        { status: 400 }
      );
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      if (
        !q.question ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        typeof q.answer !== "number" ||
        !q.category
      ) {
        return NextResponse.json(
          {
            error: "Invalid question format",
            index: i,
          },
          { status: 400 }
        );
      }
    }

    const created = await prisma.examQuestion.createMany({
      data: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.answer,
        category: q.category as ExamCategory,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      inserted: created.count,
    });
  } catch (err: any) {
    console.error("IMPORT ERROR:", err);

    return NextResponse.json(
      {
        error: "Failed to import questions",
        details: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}