"use client";

import { useEffect, useMemo, useState } from "react";
import Loading from "@/components/loading-icon";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faCopy } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";

type ImportPayload = {
  questions: {
    id?: string;
    question: string;
    options: string[];
    answer: number;
  }[];
};

type DistributionItem = {
  category: string;
  count: number;
};

const IMPORT_PROMPT = "Generate NPPE-style multiple-choice exam questions for Canadian engineering licensure preparation.\n\nYou must output ONLY valid JSON in this exact structure:\n\n{\n  \"questions\": [\n    {\n      \"question\": \"...\",\n      \"options\": [\"...\", \"...\", \"...\", \"...\"],\n      \"answer\": 0,\n      \"category\": \"ETHICS\"\n    }\n  ]\n}\n\n---\n\nTOTAL QUESTIONS\n\nGenerate exactly X questions total, where X is provided externally.\n\nIf X is not explicitly provided, assume X = 100.\n\n---\n\nPROPORTIONAL DISTRIBUTION RULE\n\nMaintain the following category weight ratios:\n\n- PROFESSIONALISM: 10\n- ETHICS: 20\n- PROFESSIONAL_PRACTICE: 30\n- LAW_FOR_PROFESSIONAL_PRACTICE: 25\n- PROFESSIONAL_LAW: 10\n- DISCIPLINE_AND_REGULATION: 15\n\nTotal weight = 100\n\nYou MUST scale these proportions to match 50.\n\n---\n\nALLOCATION METHOD (MANDATORY)\n\n1. Compute:\n   category_count = round((category_weight / 100) * X)\n\n2. Adjust rounding so that:\n   - Total sum of all categories = X exactly\n   - If there is rounding error:\n     - Add/subtract remaining questions starting from highest-weight categories in order:\n       PROFESSIONAL_PRACTICE → LAW_FOR_PROFESSIONAL_PRACTICE → ETHICS → DISCIPLINE_AND_REGULATION → PROFESSIONALISM → PROFESSIONAL_LAW\n\n3. Final result MUST match X exactly.\n\n---\n\nCONTENT DOMAIN\n\nAll questions must be strictly based on NPPE competency areas:\n\n- Engineering ethics\n- Professional responsibility\n- Duty to public safety\n- Conflict of interest\n- Confidentiality\n- Due diligence\n- Negligence, liability, and standard of care\n- Regulatory obligations and statutory interpretation\n- Professional misconduct and disciplinary standards\n- Whistleblowing and duty to report\n- Competence, scope of practice, and limitations of expertise\n- Contract law and professional obligations\n- Tort law and negligence frameworks\n- Environmental and societal impacts of engineering work\n- Risk management, QA/QC, and professional due diligence\n- Relationships with employers, clients, regulators, and the public\n\n---\n\nQUESTION STYLE RULES (HARD MODE)\n\n- Questions must be highly challenging and exam-caliber (NPPE professional licensing level)\n- Every question must be scenario-based with realistic Canadian engineering contexts\n- Scenarios must include layered constraints (legal + ethical + contractual + safety conflicts)\n- Require deep judgment, not recall or definitions\n- Avoid obvious clue wording\n- Avoid telegraphing correct answers\n- Include ambiguity where multiple answers are defensible, but only ONE is best under professional standards\n- Distractors must be extremely close in correctness:\n  - All options must be plausible in real engineering practice\n  - All options must be professionally defensible at first glance\n  - Differences must be subtle (standard-of-care, hierarchy of duty, jurisdictional nuance)\n  - Avoid obviously wrong answers\n\nInclude scenarios involving:\n- supervisor vs junior engineer conflicts\n- client pressure vs public safety obligations\n- regulatory reporting dilemmas\n- cost/schedule vs safety trade-offs\n- uncertainty and incomplete information\n- document control and professional sign-off responsibilities\n- inter-professional conflicts\n- whistleblowing thresholds\n\n---\n\nOUTPUT CONSTRAINTS\n\n- Exactly 4 answer choices per question\n- answer must be integer index (0–3)\n- category must be one of:\n  PROFESSIONALISM\n  ETHICS\n  PROFESSIONAL_PRACTICE\n  LAW_FOR_PROFESSIONAL_PRACTICE\n  PROFESSIONAL_LAW\n  DISCIPLINE_AND_REGULATION\n- No id field\n- No explanations\n- No markdown\n- No extra text outside JSON\n- Must be valid JSON parseable by JSON.parse()\n\n---\n\nQUALITY CONSTRAINT\n\n- At least 2 options per question must be plausibly correct under partial interpretation\n- Correct answer must be BEST under strict NPPE Canadian professional standards hierarchy\n- Distractors must be near-indistinguishable in correctness\n\n---\n\nADDITIONAL RULE\n\n- Do not repeat previously generated questions";

export default function ImportPage() {
  // IMPORT
  const [jsonInput, setJsonInput] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // DISTRIBUTION
  const [dist, setDist] = useState<DistributionItem[]>([]);
  const [distLoading, setDistLoading] = useState(true);
  const [distError, setDistError] = useState<string | null>(null);

  // SEARCH
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);

  const CATEGORY_LABELS: Record<string, string> = {
    PROFESSIONALISM: "Professionalism",
    ETHICS: "Ethics",
    PROFESSIONAL_PRACTICE: "Professional Practice",
    LAW_FOR_PROFESSIONAL_PRACTICE: "Law for Professional Practice",
    PROFESSIONAL_LAW: "Professional Law",
    DISCIPLINE_AND_REGULATION: "Regulation & Discipline",
  };

  const total = useMemo(
    () => dist.reduce((sum, d) => sum + d.count, 0),
    [dist]
  );

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (e) {
      setCopied(false);
    }
  }

  // ---------------- IMPORT ----------------
  function validate(json: any): json is ImportPayload {
    return (
      json &&
      Array.isArray(json.questions) &&
      json.questions.length > 0 &&
      json.questions.every(
        (q: any) =>
          typeof q.question === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.answer === "number"
      )
    );
  }

  async function handleImport() {
    setImportError(null);
    setImportResult(null);

    let parsed: any;

    try {
      parsed = JSON.parse(jsonInput);
    } catch {
      setImportError("Invalid JSON format");
      return;
    }

    if (!validate(parsed)) {
      setImportError("Invalid structure.");
      return;
    }

    try {
      setImportLoading(true);

      const res = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: parsed.questions }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportResult(data);
      setJsonInput("");

      loadDistribution();
    } catch (err: any) {
      setImportError(err.message);
    } finally {
      setImportLoading(false);
    }
  }

  // ---------------- DISTRIBUTION ----------------
  async function loadDistribution() {
    try {
      setDistLoading(true);
      setDistError(null);

      const res = await fetch("/api/questions/distribution");
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Failed to load");

      setDist(json.data);
    } catch (err: any) {
      setDistError(err.message);
    } finally {
      setDistLoading(false);
    }
  }

  useEffect(() => {
    loadDistribution();
  }, []);

  // ---------------- SEARCH ----------------
  async function search() {
    if (!query.trim()) return;

    try {
      setSearchLoading(true);
      setSearchError(null);

      const res = await fetch(
        `/api/questions/search?q=${encodeURIComponent(query)}`
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Search failed");

      setSearchQuery(query);
      setSearchResults(json.data);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  function highlightMatch(text: string, search: string) {
    if (!search.trim()) return text;

    const regex = new RegExp(`(${search})`, "gi");

    return text.split(regex).map((part, idx) =>
      regex.test(part) ? (
        <mark
          key={idx}
          className="bg-yellow-200 text-black px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  // ---------------- UI ----------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto mb-6">
        <nav className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
          <a
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-black hover:underline transition"
          >
            <FontAwesomeIcon icon={faChevronLeft} />Back to Home
          </a>

          <span className="text-lg font-semibold text-gray-900">
            Question Management
          </span>

          <div className="w-24" />
        </nav>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">

        {/* IMPORT */}
        <div className="flex flex-col justify-between w-full lg:w-1/2 bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Import Questions</h2>
            
            <button
              onClick={copyPrompt}
              className={`text-sm px-3 py-1 rounded cursor-pointer transition ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-green-700 hover:bg-green-800 text-white"
              }`}
            >
              {copied ? <FontAwesomeIcon icon={faCheckCircle} /> : <FontAwesomeIcon icon={faCopy} />} Prompt
            </button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Paste JSON here..."
            className="w-full p-3 border border-gray-200 rounded-md font-mono text-sm h-fit flex-1 resize-none"
          />

          <button
            onClick={handleImport}
            disabled={importLoading}
            className="w-full bg-green-700 text-white h-10 rounded-md cursor-pointer"
          >
            {importLoading ? <Loading size="sm" /> : "Import"}
          </button>

          {importError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {importError}
            </div>
          )}

          {importResult && (
            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
              Imported: {importResult.inserted}
            </div>
          )}
        </div>

        {/* DISTRIBUTION */}
        <div className="w-full lg:w-1/2 bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Distribution</h2>

              {!distLoading && !distError && (
                <div className="text-sm text-gray-500 mt-1">
                  Total Questions: <span className="font-semibold text-gray-700">{total}</span>
                </div>
              )}
            </div>

            <button
              onClick={loadDistribution}
              className="text-sm bg-green-700 text-white px-3 py-1 rounded cursor-pointer"
            >
              Refresh
            </button>
          </div>

          {distLoading && (
            <div className="w-full flex items-center justify-center">
              <Loading size="base" />
            </div>
          )}

          {distError && (
            <div className="text-sm text-red-600">{distError}</div>
          )}

          {!distLoading &&
            !distError &&
            dist.map((item) => {
              const percent = total ? (item.count / total) * 100 : 0;

              return (
                <div
                  key={item.category}
                  className="border border-gray-200 p-3 rounded-md"
                >
                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>

                    <span className="text-sm">
                      {item.count} ({percent.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="h-2 bg-gray-100 rounded mt-2">
                    <div
                      className="h-2 bg-green-600 rounded"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* SEARCH */}
      <div className="max-w-7xl mx-auto mt-6 bg-white p-6 rounded-xl shadow border border-gray-200 space-y-4">
        <h2 className="text-xl font-bold">Search Questions</h2>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                search();
              }
            }}
            className="flex-1 border border-gray-200 p-2 rounded-md text-sm"
            placeholder="Search questions..."
          />

          <button
            onClick={search}
            className="bg-green-700 text-white px-4 rounded-md cursor-pointer"
          >
            Search
          </button>
        </div>

        {searchLoading && <div className="w-full flex items-center justify-center"><Loading size="base" /></div>}

        {searchError && (
          <div className="text-sm text-red-600">{searchError}</div>
        )}

        <div className="space-y-2">
          {!searchLoading && searchResults.length === 0 ? (
            <div className="text-sm text-gray-500">No results</div>
          ) : (
            searchResults.map((q) => (
              <div
                key={q.id}
                className="border border-gray-200 p-3 rounded-md text-sm space-y-1"
              >
                <div className="text-xs text-gray-500 font-mono">
                  ID: {q.id}
                </div>

                <div className="font-medium">
                  {highlightMatch(q.question, searchQuery)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}