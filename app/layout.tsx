import type { Metadata } from "next";
import "./globals.css";
import LiveStrip from "@/components/LiveStrip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingLiveButton from "@/components/FloatingLiveButton";

export const metadata: Metadata = {
    title: "Vivid Wins — UK's #1 Pokémon Competitions",
    description:
        "Buy tickets to win premium Pokémon ETBs, UPCs and booster packs. 17.5% instant site credit wins, 5% booster pack wins, 5% golden bonus tickets, plus live-drawn grand prizes on Whatnot.",
    metadataBase: new URL(
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en-GB">
            <head>
                <link
                    rel="preconnect"
                    href="https://fonts.googleapis.com"
                />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin=""
                />
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap"
                />
            </head>
            <body>
                <LiveStrip />
                <Header />
                {children}
                <Footer />
                <FloatingLiveButton />
            </body>
        </html>
    );
}
