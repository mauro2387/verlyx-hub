import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verlyx Hub - Gestión Empresarial",
  description: "Sistema integral de gestión empresarial - CRM, Proyectos, Tareas, Deals",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased bg-gray-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
