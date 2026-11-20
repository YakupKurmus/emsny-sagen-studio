import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Merriweather, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-merriweather",
});

export const metadata: Metadata = {
  title: "Emsny Sagen-Studio – Lesestudio & Schreibwerkstatt",
  description:
    "Sagen lesen, als Hörbuch anhören und in 4 klaren Bausteinen mit KI-Feedback nacherzählen – für die 6. Schulstufe AHS (B2-Niveau).",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${nunito.variable} ${bricolage.variable} ${merriweather.variable}`}
    >
      <body className="min-h-screen bg-[#f8f9fa] text-slate-800 antialiased selection:bg-emerald-200">
        {children}
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
