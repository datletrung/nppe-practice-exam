import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.examQuestion.groupBy({
      by: ["category"],
      _count: {
        category: true,
      },
    });

    return NextResponse.json({
      data: result.map((r) => ({
        category: r.category,
        count: r._count.category,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to fetch distribution",
        details: err.message,
      },
      { status: 500 }
    );
  }
}