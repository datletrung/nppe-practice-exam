"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function Register() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message || "Register failed");
      return;
    }

    router.push(callbackUrl);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Create Account
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black"
            placeholder="Name"
            type="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-black"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            disabled={loading}
            className="w-full bg-black text-white rounded-lg p-3 hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-center mt-4 text-gray-600">
          Already have an account?{" "}
          <a className="underline" href="/auth">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}