"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="max-w-3xl w-full bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center space-y-5">
        <h1 className="text-3xl font-bold">
          National Professional Practice Exam Simulator
        </h1>

        <p className="text-gray-600 text-sm leading-relaxed">
          Practice for the National Professional Practice Exam with timed
          multiple-choice exams covering ethics, professional responsibility,
          law, and regulatory practice.
        </p>

        <div className="text-left text-sm text-gray-700 space-y-2">
          <p>• Timed exam sessions</p>
          <p>• Multiple-choice practice questions</p>
          <p>• Randomized question sets</p>
          <p>• Instant scoring after submission</p>
          <p>• Detailed answer review</p>
        </div>

        <div className="flex flex-col gap-3 pt-3">
          <Link
            href="/exam"
            className="w-full h-11 flex items-center justify-center bg-green-700 text-white rounded-lg shadow hover:bg-green-800 cursor-pointer"
          >
            Start Exam
          </Link>
          <Link
            href="/questions"
            className="w-full h-11 flex items-center justify-center border border-green-700 text-green-700 rounded-lg hover:bg-green-50"
          >
            Question Bank
          </Link>
        </div>

        <div className="pt-2 text-xs text-gray-500">
          Tip: Focus on understanding ethical reasoning and professional
          responsibilities rather than memorizing answers.
        </div>

        <p className="text-gray-500 text-xs leading-relaxed pt-3 border-t">
          Disclaimer: This is an unofficial practice tool created for
          educational purposes only. It is not affiliated with, endorsed by,
          or connected to Engineers Canada or any provincial/territorial
          engineering regulator.
        </p>
      </div>

      <ProductFooter />
    </div>
  );
}

function ProductFooter() {
  return (
    <footer className="text-center text-sm text-gray-600 py-6">
      <div>
        NPPE Practice Exam Simulator by{" "}
        <Link
          className="font-semibold text-gray-700"
          target="_blank"
          href="https://daydreamtech.ca"
        >
          Daydream Technology Inc.
        </Link>
      </div>

      <div className="flex justify-center gap-1">
        © {new Date().getFullYear()}
        <Link
          className="text-gray-600"
          target="_blank"
          href="https://daydreamtech.ca"
        >
          Daydream Technology Inc.
        </Link>
        All rights reserved.
      </div>
    </footer>
  );
}