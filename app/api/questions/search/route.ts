import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ data: [] });
  }

  try {
    const results = await prisma.examQuestion.findMany({
      where: {
        question: {
          contains: q,
          mode: "insensitive",
        },
      },
      take: 20,
      select: {
        id: true,
        question: true,
      },
    });

    return NextResponse.json({ data: results });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Search failed",
        details: err.message,
      },
      { status: 500 }
    );
  }
}