import "./globals.css";
import Providers from "./providers";
import { GlobalStyle } from "@/components/shared";
import { COLORS } from "@/lib/constants";

export const metadata = {
  title: "Het Clausement",
  description: "Puntensysteem voor VCH",
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body style={{ background: COLORS.paper }}>
        <GlobalStyle />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
