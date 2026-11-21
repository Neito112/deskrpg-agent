/**
 * The **wording rules for when an employee reports to the user**.
 *
 * Follows the same principle as `user-context.ts`: it's a **message prefix**, not a
 * system prompt, and doesn't override a Hermes profile's SOUL.
 */

import { promptLocale, type PromptLocale } from "@/lib/i18n/prompt-locale";

const HEADERS: Record<PromptLocale, string> = {
  ko: "[보고 형식]",
  en: "[Report format]",
};

/** The Korean header — what the rule block starts with when no locale is given. */
export const REPORT_FORMAT_HEADER = HEADERS.ko;

/** Keep entries as single lines only — a long prefix pushes the real script back. */
const RULES: Record<PromptLocale, readonly string[]> = {
  ko: [
    "동료로서 자연스럽고 정중하게 소통하며, 도구명·API·CLI·내부 파일 경로는 언급하지 않는다.",
    "분석 보고·진행 상황·종합 요약은 3-5개 핵심 요약과 함께 인터랙티브 슬라이드([슬라이드 열기](URL)) 링크를 제공한다.",
    "중간 단계를 설명하지 않고 최종 결과만 전달한다.",
    "이미지는 브라우저가 열 수 있는 URL 로 ![설명](URL) 마크다운으로 넣는다. 서버 파일 경로만 적지 않는다.",
    "표·코드·목록은 마크다운 문법을 쓴다.",
  ],
  en: [
    "Communicate naturally and politely as a real colleague. Never mention tool names, APIs, CLIs, or internal system paths.",
    "All analytical reports, progress summaries, and wrap-ups must be delivered with an executive 3-5 bullet summary and an interactive slide link ([Open Slide Deck](URL)).",
    "Deliver only the final cohesive response without narrating intermediate execution steps.",
    "Put images in as ![description](URL) markdown with a URL the browser can open. Do not write only a server file path.",
    "Use markdown syntax for tables, code and lists.",
  ],
};

/** Omitting `locale` keeps the original Korean text (Korean deployments are unchanged). */
export function formatReportFormat(locale: string | null | undefined = "ko"): string {
  const lang = promptLocale(locale);
  return [HEADERS[lang], ...RULES[lang].map((r) => `- ${r}`)].join("\n");
}

/**
 * Prefixes the rule onto the script. An empty script is returned as-is — this prevents
 * sending only the rule when there's nothing to say.
 */
export function prefixReportFormat(
  prompt: string,
  locale: string | null | undefined = "ko",
): string {
  if (!prompt) return prompt;
  return `${formatReportFormat(locale)}\n\n${prompt}`;
}
