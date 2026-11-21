"use client";
import { type ReactNode } from "react";
import { I18nProvider, type Locale } from "@/lib/i18n";
import { RubberHoseProvider } from "@/lib/rubber-hose/theme-context";

export default function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <RubberHoseProvider>{children}</RubberHoseProvider>
    </I18nProvider>
  );
}
