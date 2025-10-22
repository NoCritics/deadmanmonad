import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/WalletContext";

export const metadata: Metadata = {
  title: "Digital Inheritance Vault",
  description: "MetaMask Smart Accounts x Monad - Dead Man's Switch Vault",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletProvider>
          <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <nav className="gradient-bg p-4 shadow-lg">
              <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>🏦 Digital Inheritance Vault</h1>
                <p className="text-sm" style={{ color: '#06B6D4' }}>MetaMask Smart Accounts × Monad</p>
              </div>
            </nav>
            <main className="container mx-auto py-8 px-4">
              {children}
            </main>
            <footer className="text-center py-6 text-gray-600 dark:text-gray-400">
              <p>Built for MetaMask Smart Accounts x Monad Dev Cook-Off</p>
            </footer>
          </div>
        </WalletProvider>
      </body>
    </html>
  );
}
