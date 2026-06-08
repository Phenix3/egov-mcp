import React, { useState } from "react";
import { Percent, ChevronDown, ChevronUp, Info, TrendingDown } from "lucide-react";

interface BracketDetail {
  lower: number;
  upper: number | null;
  rate: number;
  amount: number;
}

interface PayrollTaxOutputData {
  gross_salary: number;
  taxable_base: number;
  irpp: number;
  other_withholdings: number;
  net_salary: number;
  bracket_details: BracketDetail[];
  note?: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n);

const fmtRange = (b: BracketDetail): string => {
  const lo = fmt(b.lower);
  return b.upper == null ? `> ${lo}` : `${lo} – ${fmt(b.upper)}`;
};

export function PayrollTaxCard({ data }: { data: PayrollTaxOutputData }) {
  const [open, setOpen] = useState(true);
  const totalDeductions = data.gross_salary - data.net_salary;
  const netPct = ((data.net_salary / data.gross_salary) * 100).toFixed(1);
  const dedPct = ((totalDeductions / data.gross_salary) * 100).toFixed(1);
  const brackets = data.bracket_details ?? [];

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Percent className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">IRPP & Retenues salariales</p>
            <p className="text-[10px] text-zinc-400">Calcul deterministique · Bareme CGI Cameroun</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
        >
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Note si IRPP non configure */}
          {data.note && (
            <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <p>{data.note}</p>
            </div>
          )}

          {/* Barre brut → net */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Brut : <strong className="text-zinc-800">{fmt(data.gross_salary)}</strong></span>
              <span className="text-green-700 font-semibold">Net : {fmt(data.net_salary)}</span>
            </div>
            <div className="h-2 bg-zinc-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${netPct}%` }} />
              <div className="h-full bg-amber-400 transition-all" style={{ width: `${dedPct}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span className="text-green-700">Net percu {netPct}%</span>
              <span className="flex items-center gap-1 text-amber-600">
                <TrendingDown className="w-3 h-3" /> Retenu {fmt(totalDeductions)} ({dedPct}%)
              </span>
            </div>
          </div>

          {/* 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Retenues */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Detail des retenues</p>
              <div className="space-y-1 text-xs">
                {[
                  ["Base imposable IRPP", fmt(data.taxable_base), false],
                  ["IRPP", fmt(data.irpp), true],
                  ["Autres retenues", fmt(data.other_withholdings), false],
                ].map(([label, value, accent]: any) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-zinc-100 last:border-0">
                    <span className="text-zinc-500">{label}</span>
                    <span className={`font-medium ${accent ? "text-amber-700" : "text-zinc-700"}`}>{value}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 border-t-2 border-zinc-200 text-sm font-semibold mt-1">
                  <span className="text-zinc-700">Total retenues</span>
                  <span className="text-amber-700">{fmt(totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Tranches IRPP */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Calcul progressif IRPP</p>
              {brackets.length > 0 ? (
                <div className="rounded-lg border border-zinc-200 divide-y divide-zinc-100 text-xs overflow-hidden">
                  {brackets.map((b, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-2 bg-white">
                      <div>
                        <span className="text-zinc-600">{fmtRange(b)}</span>
                        <span className="ml-1.5 text-[10px] bg-violet-50 text-violet-700 border border-violet-100 px-1 py-0.5 rounded">
                          {(b.rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <span className={b.amount > 0 ? "font-medium text-amber-700" : "text-zinc-300"}>
                        {fmt(b.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-zinc-200 text-zinc-400 text-xs">
                  Aucune tranche imposable
                </div>
              )}
            </div>
          </div>

          {/* Note fiscale */}
          <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p>Abattement forfaitaire <strong className="text-zinc-700">30%</strong> avant calcul IRPP. Bareme progressif CGI Cameroun.</p>
          </div>
        </div>
      )}
    </div>
  );
}
