import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import EditorPage from '@/pages/EditorPage';
import ListPage from '@/pages/ListPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-24 top-20 h-56 w-56 rounded-full bg-[rgba(237,143,86,0.25)] blur-3xl animate-float" />
          <div className="pointer-events-none absolute -right-12 top-32 h-72 w-72 rounded-full bg-[rgba(92,163,196,0.25)] blur-3xl animate-float" />

          <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 pb-6 pt-10">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-2xl font-semibold text-foreground">
                Principles Garden
              </Link>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              A shared space to shape working principles, keep them alive, and make the implicit explicit.
            </p>
          </header>

          <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20">
            <Routes>
              <Route path="/" element={<ListPage />} />
              <Route path="/:slug" element={<EditorPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
