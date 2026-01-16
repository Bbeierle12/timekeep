import { ReactNode } from 'react';
import Sidebar from './Sidebar';

type AdminLayoutProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
