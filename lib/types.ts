export type Question = {
  id: string;
  question: string;
  options: string[];
  answer: number; // index 0-3
};

export type ExamState = {
  questions: Question[];
  userAnswers: Record<string, number>;
  submitted: boolean;
};