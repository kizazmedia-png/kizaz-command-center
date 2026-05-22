import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { SiteProvider } from "@/components/SiteContext";
import AuthProvider from "@/components/AuthProvider";
import { ResultsProvider } from "@/components/ResultsContext";

export const metadata: Metadata = {
  title: "Kizaz Command Center",
  description: "AI-powered dashboard for Dog Friendly Destos and Kizaz Media",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-text font-sans antialiased">
        <AuthProvider>
          <SiteProvider>
            <ResultsProvider>
              <div className="md:flex min-h-screen">
                <Sidebar />
                <main className="flex-1 px-4 py-6 md:px-10 md:py-8 max-w-[1400px] w-full">
                  {children}
                </main>
              </div>
            </ResultsProvider>
          </SiteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
