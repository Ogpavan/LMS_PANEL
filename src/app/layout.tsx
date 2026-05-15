import { Public_Sans } from "next/font/google";

import "@/styles/globals.css";

import { ThemeProvider } from "@/providers/theme-provider";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans"
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={publicSans.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
