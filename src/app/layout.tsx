import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import WorkspaceShell from "@/components/WorkspaceShell";
import Providers from "@/components/Providers";
import AppTitlebar from "@/components/AppTitlebar";
import GeminiSetupBanner from "@/components/GeminiSetupBanner";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/constants";
import { normalizeLocale, translateServer } from "@/lib/i18n/server";
import "./globals.css";
import "@/game/three/lookbook.css";

async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return normalizeLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? headerStore.get("accept-language"),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  return {
    title: translateServer(locale, "metadata.title"),
    description: translateServer(locale, "metadata.description"),
    keywords: translateServer(locale, "metadata.keywords")
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    authors: [{ name: "Dante Labs", url: "https://dante-labs.com" }],
    openGraph: {
      title: "DeskRPG for Hermes",
      description: translateServer(locale, "metadata.openGraphDescription"),
      siteName: "DeskRPG for Hermes",
      type: "website",
    },
    icons: {
      shortcut: "/favicon.ico",
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/apple-icon.png",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Itim&family=Mali:wght@400;600;700&family=Patrick+Hand&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers initialLocale={locale}>
          <AppTitlebar />
          <GeminiSetupBanner />
          <div className="app-viewport flex-1 min-h-0 flex flex-col">
            <WorkspaceShell>{children}</WorkspaceShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
