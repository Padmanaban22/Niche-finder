import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import { QuotaBarClient } from "@/components/QuotaBarClient";
import { ModeToggle } from "@/components/ModeToggle";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NicheHunter | Youtube Faceless Research",
  description: "Advanced YouTube faceless niche research tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} flex h-screen w-screen overflow-hidden bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <Sidebar />
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card shrink-0">
              <QuotaBarClient />
              <div className="flex items-center gap-4">
                <ModeToggle />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
