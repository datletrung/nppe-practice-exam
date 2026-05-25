const KEY = "nppe_exam_questions";

export function getStoredQuestions(): string[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(KEY) || "[]");
}

export function saveQuestionHashes(hashes: string[]) {
  localStorage.setItem(KEY, JSON.stringify(hashes));
}

export function hasDuplicate(hash: string): boolean {
  return getStoredQuestions().includes(hash);
}

export function storeQuestion(hash: string) {
  const existing = getStoredQuestions();
  existing.push(hash);
  saveQuestionHashes(existing);
}