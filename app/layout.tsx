import type { Metadata } from "next";
import { JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell, SidebarProvider } from "@/components/sidebar";
import { ActivityProvider } from "@/components/activity-dock";
import { ServerEventsProvider } from "@/components/server-events";
import { AppearanceProvider } from "@/components/settings/appearance";
import UpdateBanner from "@/components/update-banner";
import { HOSTED_UI } from "@/lib/hosted";
import { DIR, LOCALE, t } from "@/lib/i18n";

// Chrome = JetBrains Mono, teaching prose = Source Sans 3, titles = CMU
// Serif (the bundled lh-cmu @font-face in globals.css — no CDN).
const ui = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });
const prose = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans3" });

export const metadata: Metadata = {
	title: t("Learning Harness"),
	description: t("A teacher agent with a memory — sessions, quizzes, and a knowledge graph of what you know."),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		// Hosted (teeez fork): the host serves a skin beside the app, under
		// /__host/. Its script runs before the body and may change <html>'s
		// class (light or dark, following the host app), hence
		// suppressHydrationWarning; its stylesheet maps the host's colours and
		// faces onto the tokens in globals.css. Without a host both are absent
		// (404) and the app stays as it is.
		<html lang={LOCALE} dir={DIR} className={`dark ${ui.variable} ${prose.variable}`} suppressHydrationWarning={HOSTED_UI}>
			{HOSTED_UI && (
				<head>
					<link rel="stylesheet" href="/__host/skin.css" />
					{/* eslint-disable-next-line @next/next/no-sync-scripts -- it must set the theme before the first paint */}
					<script src="/__host/skin.js" />
				</head>
			)}
			<body className="min-h-dvh antialiased">
			{/* The notification channel rides OUTSIDE everything: sidebar, dock,
				 and pages all subscribe as the polls retire (push S3, 2026-10-02). */}
			<ServerEventsProvider>
				<AppearanceProvider>
					<SidebarProvider>
						<ActivityProvider>
							<AppShell>{children}</AppShell>
						</ActivityProvider>
					</SidebarProvider>
				</AppearanceProvider>
			</ServerEventsProvider>
			{/* Auto-update banner (Wave C): fixed card, Electron-only pushes. */}
			<UpdateBanner />
		</body>
		</html>
	);
}
