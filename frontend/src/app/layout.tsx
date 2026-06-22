import './globals.css';

export const metadata = {
  title: 'Trao AI Travel Planner',
  description: 'AI-powered travel planning with weather-aware packing assistant',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

