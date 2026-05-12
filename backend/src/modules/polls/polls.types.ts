import type { Poll } from "../../shared/db/schema.js";

export type PollStatus = Poll["status"];
export type ResponseMode = Poll["responseMode"];

export type OptionDTO = {
  id: string;
  label: string;
  orderIndex: number;
};

export type QuestionDTO = {
  id: string;
  prompt: string;
  isRequired: boolean;
  orderIndex: number;
  options: OptionDTO[];
};

export type PollDTO = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  responseMode: ResponseMode;
  status: PollStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  questions: QuestionDTO[];
};

export type PollSummaryDTO = {
  id: string;
  title: string;
  slug: string;
  status: PollStatus;
  responseMode: ResponseMode;
  expiresAt: string | null;
  createdAt: string;
  totalResponses: number;
};

export type AnalyticsOption = {
  optionId: string;
  label: string;
  count: number;
  pct: number;
};

export type AnalyticsQuestion = {
  questionId: string;
  prompt: string;
  isRequired: boolean;
  totalAnswers: number;
  options: AnalyticsOption[];
};

export type Analytics = {
  pollId: string;
  totalResponses: number;
  uniqueAuthRespondents: number;
  perQuestion: AnalyticsQuestion[];
};
