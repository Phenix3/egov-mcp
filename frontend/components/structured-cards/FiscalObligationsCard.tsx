"use client";

import React from "react";
import { FiscalObligationsData } from "../../lib/types";
import { CalendarClock, AlertCircle } from "lucide-react";

const FREQ_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  annual: "Annuel",
};

const TYPE_COLORS: Record<string, string> = {
  TVA: "bg-blue-50 text-blue-700 border-blue-100",
  IRPP: "bg-violet-50 text-violet-700 border-violet-100",
  IS: "bg-amber-50 text-amber-700 border-amber-100",
  CNPS: "bg-emerald-50 text-emerald-700 border-emerald-100",
  DSF: "bg-rose-50 text-rose-700 border-rose-100",
};

const MONTH_NAMES: Record<number, string> = {
  1: "janvier", 2: "février", 3: "mars", 4: "avril",
  5: "mai", 6: "juin", 7: "juillet", 8: "août",
  9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre",
};

export function FiscalObligationsCard({ data }: { data: FiscalObligationsData }) {
  const subtitle = data.month
    ? `Échéances de ${MONTH_NAMES[data.month]}`
    : data.obligation_type === "all"
    ? "Toutes les obligations"
    : `Obligations ${data.obligation_type}`;

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-zinc-100">
        <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
          <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 leading-snug">
            Obligations fiscales &amp; sociales
          </p>
          <p className="text-[10px] text-zinc-400">
            CGI Cameroun + CNPS · {subtitle} · {data.count} obligation{data.count > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Obligations list */}
      <div className="divide-y divide-zinc-100">
        {data.obligations.length === 0 ? (
          <div className="px-4 py-6 flex items-center gap-2 text-zinc-400 text-xs justify-center">
            <AlertCircle className="w-4 h-4" />
            Aucune obligation pour ce filtre.
          </div>
        ) : (
          data.obligations.map((ob, i) => {
            const colorClass = TYPE_COLORS[ob.type] ?? "bg-zinc-50 text-zinc-700 border-zinc-200";
            return (
              <div key={i} className="px-4 py-3 hover:bg-zinc-50 transition-colors">
                <div className="flex items-start gap-3">
                  <span
                    className={`shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${colorClass}`}
                  >
                    {ob.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 leading-snug">
                      {ob.label}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      <span className="text-[10px] text-zinc-500">
                        <span className="font-medium text-zinc-700">Échéance :</span>{" "}
                        {ob.deadline_description}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {FREQ_LABELS[ob.frequency] ?? ob.frequency}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{ob.applicable_to}</p>
                    {ob.legal_reference && (
                      <p className="text-[9px] text-zinc-300 mt-0.5 italic">{ob.legal_reference}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
        <p className="text-[10px] text-zinc-400">
          Source : Code Général des Impôts Cameroun · Réglementation CNPS · Données à titre indicatif
        </p>
      </div>
    </div>
  );
}
