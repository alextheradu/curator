export type SearchMode = "fast" | "balanced" | "deep";

export type SearchActivityStepType = "documents" | "web" | "tba" | "rate_limit" | "budget";

export type SearchActivityStep = {
  type: SearchActivityStepType;
  label: string;
  query?: string;
  count?: number;
  status: "ok" | "empty" | "limited" | "error";
};

export type SearchActivity = {
  mode: SearchMode;
  steps: SearchActivityStep[];
  durationMs: number;
};

export function summarizeSearchActivity(activity?: SearchActivity) {
  if (!activity || activity.steps.length === 0) {
    return "";
  }

  const documents = activity.steps
    .filter((step) => step.type === "documents")
    .reduce((total, step) => total + (step.count ?? 0), 0);
  const web = activity.steps
    .filter((step) => step.type === "web")
    .reduce((total, step) => total + (step.count ?? 0), 0);
  const tba = activity.steps.filter((step) => step.type === "tba").length;
  const limited = activity.steps.some((step) => step.type === "rate_limit");
  const parts = [
    documents > 0 ? `${documents} PDF page${documents === 1 ? "" : "s"}` : null,
    web > 0 ? `${web} web result${web === 1 ? "" : "s"}` : null,
    tba > 0 ? `${tba} live-data call${tba === 1 ? "" : "s"}` : null,
    limited ? "web rate limit reached" : null,
  ].filter(Boolean);

  return parts.join(" · ");
}
