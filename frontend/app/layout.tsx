import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Providers } from "./providers";
import { Nav } from "./nav";
import "@fontsource-variable/vazirmatn";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iran Glass Claim · ایران‌گلس‌کلیم",
  description: "Repair-first glass claims, instant pay and insurance services for Iranian insurers.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "fa";
  const theme = c.get("theme")?.value || "system";
  return (
    <html lang={lang} dir={lang === "fa" ? "rtl" : "ltr"} data-theme={theme} suppressHydrationWarning>
      <body>
        <div className="aurora" aria-hidden><i /><i /><i /></div>
        <Providers lang={lang} theme={theme}>
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
