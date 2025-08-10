export const metadata = { title: "Ticketing", description: "Demo" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 20 }}>
        <header style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <a href="/">Inicio</a>
          <a href="/tickets">Tickets</a>
          <a href="/assets">Assets</a>
          <a href="/scan">Scan</a>
          <a href="/admin/seed">Admin/Seed</a>
        </header>
        {children}
      </body>
    </html>
  );
}
