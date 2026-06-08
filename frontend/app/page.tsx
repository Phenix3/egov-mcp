import React from "react";
import { ChatInterface } from "../components/chat-interface";
import {
  Building2,
  ShieldCheck,
  FileText,
  Scale,
  TrendingUp,
  ExternalLink,
  Info,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* ── Header ── */}
      <header className="h-[57px] bg-white border-b border-zinc-200 px-5 flex items-center justify-between sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm" style={{ fontFamily: "var(--font-display)" }}>
            Liwaza
          </span>
          <span className="text-zinc-300 select-none">·</span>
          <span className="text-zinc-500 text-sm hidden sm:block">Guichet Fiscal PME Cameroun</span>
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-50 text-violet-700 border border-violet-200 rounded-md">
            MCP
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <a
            href="https://liwaza.org"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 hover:text-zinc-900 transition-colors"
          >
            liwaza.org <ExternalLink className="w-3 h-3" />
          </a>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-zinc-400">Édition 2026</span>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>

        {/* ── Sidebar ── */}
        <aside className="w-[268px] shrink-0 bg-white border-r border-zinc-200 overflow-y-auto hidden lg:flex flex-col">

          {/* Fiscal reference */}
          <div className="p-5 border-b border-zinc-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-4">
              Référence fiscale
            </p>

            <div className="space-y-5">
              {/* CNPS */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-800">Cotisations CNPS</span>
                </div>
                <div className="space-y-1.5 pl-5 text-[11px]">
                  {[
                    ["Retraite salarié", "4,2 %"],
                    ["Retraite patronale", "4,2 %"],
                    ["Allocs. familiales", "7,0 %"],
                    ["ATMP A / B / C", "1,75 / 2,5 / 5 %"],
                    ["SMIG mensuel", "36 270 XAF"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-zinc-500">{label}</span>
                      <span className="font-medium text-zinc-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* IRPP */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <FileText className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-800">IRPP</span>
                </div>
                <div className="space-y-1.5 pl-5 text-[11px]">
                  {[
                    ["Abattement profess.", "30 %"],
                    ["CAC additionnel", "10 % de l'IRPP"],
                    ["Barème", "Progressif CGI"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-zinc-500">{label}</span>
                      <span className="font-medium text-zinc-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TVA */}
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Scale className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-800">TVA</span>
                </div>
                <div className="space-y-1.5 pl-5 text-[11px]">
                  {[
                    ["Taux de base", "17,5 %"],
                    ["+ CAC communes", "1,75 % (10 % TVA)"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-zinc-500">{label}</span>
                      <span className="font-medium text-zinc-700">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-100 mt-1">
                    <span className="text-zinc-600 font-medium">Taux cumulé</span>
                    <span className="font-bold text-violet-700">19,25 %</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sources */}
          <div className="p-5 border-b border-zinc-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">
              Sources de données
            </p>
            <div className="space-y-2 text-[11px] text-zinc-500">
              {[
                [TrendingUp, "Banque Mondiale (API temps réel)"],
                [FileText, "CGI Cameroun / DGI"],
                [ShieldCheck, "Décrets CNPS 2016"],
              ].map(([Icon, label]: any) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer + credits */}
          <div className="p-5 mt-auto">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex gap-2 items-start">
                <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-amber-800">
                  Calculs déterministes. Aucune donnée simulée. Validez avec votre expert-comptable.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-4">
              Powered by FastMCP · Antigravity AI
            </p>
          </div>
        </aside>

        {/* ── Chat ── */}
        <main className="flex-1 overflow-hidden">
          <ChatInterface />
        </main>
      </div>
    </div>
  );
}