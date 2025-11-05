"use client";

import Image from "next/image";

interface HeaderProps {
  title?: string;
  showLogo?: boolean;
}

export function Header({ title, showLogo = true }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="flex items-center gap-3 px-6 py-4">
        {showLogo && (
          <Image
            src="/teeth-logo.webp"
            alt="Logo"
            width={32}
            height={32}
            className="object-contain"
          />
        )}
        {title && (
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        )}
      </div>
    </header>
  );
}

