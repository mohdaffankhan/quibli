export type PollStatus = "draft" | "active" | "closed" | "published";
export type ResponseMode = "anonymous" | "authenticated";

export interface OptionDTO {
  id: string;
  label: string;
  orderIndex: number;
}

export interface QuestionDTO {
  id: string;
  prompt: string;
  isRequired: boolean;
  orderIndex: number;
  options: OptionDTO[];
}

export interface PollDTO {
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
}

export interface PollSummaryDTO {
  id: string;
  title: string;
  slug: string;
  status: PollStatus;
  responseMode: ResponseMode;
  expiresAt: string | null;
  createdAt: string;
  totalResponses: number;
}

export interface AnalyticsOption {
  optionId: string;
  label: string;
  count: number;
  pct: number;
}

export interface AnalyticsQuestion {
  questionId: string;
  prompt: string;
  isRequired: boolean;
  totalAnswers: number;
  options: AnalyticsOption[];
}

export interface Analytics {
  pollId: string;
  totalResponses: number;
  uniqueAuthRespondents: number;
  perQuestion: AnalyticsQuestion[];
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface CreatePollInput {
  title: string;
  description?: string | null;
  responseMode: ResponseMode;
  expiresAt?: string | null;
  questions: {
    prompt: string;
    isRequired: boolean;
    options: { label: string }[];
  }[];
}

export type UpdatePollInput = Partial<CreatePollInput>;

export interface RespondInput {
  answers: { questionId: string; optionId: string }[];
}

export type TimeseriesGranularity = "hour" | "day";
export type TimeseriesWindow = "24h" | "7d" | "30d";

export interface TimeseriesBucket {
  t: string;
  count: number;
}

export interface AnalyticsTimeseries {
  pollId: string;
  granularity: TimeseriesGranularity;
  window: TimeseriesWindow;
  buckets: TimeseriesBucket[];
}
