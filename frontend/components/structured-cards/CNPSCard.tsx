import React, { useState } from "react";
import { ShieldCheck, ChevronDown, ChevronUp, Info } from "lucide-react";

interface CNPSContribution {
  index: number;
  gross_salary: number;
  capped_base: number;
  old_age_pension_employee: number;
  old_age_pension_employer: number;
  family_allowances_employer: number;
  work_injury_employer: number;
  total_employee: number;
  total_employer: number;
}

interface CNPSOutputData {
  contributions: CNPSContribution[];
  grand_total_employee: number;
  grand_total_employer: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n);

function sumCol(rows: CNPSContribution[], key: keyof CNPSContribution): number {
  return rows.reduce((acc, r) => acc + (r[key] as number), 0);
}

export function CNPSCard({ data }: { data: CNPSOutputData }) {
  const [open, setOpen] = useState(true);
  const rows = data.contributions ?? [];

  const colTotals = {
    gross_salary: sumCol(rows, "gross_salary"),
    old_age_pension_employee: sumCol(rows, "old_age_pension_employee"),
    old_age_pension_employer: sumCol(rows, "old_age_pension_employer"),
    family_allowances_employer: sumCol(rows, "family_allowances_employer"),
    work_injury_employer: sumCol(rows, "work_injury_employer"),
  };

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Cotisations CNPS</p>
            <p className="text-[10px] text-zinc-400">Calcul deterministique · Decrets Cameroun</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
          aria-label={open ? "Reduire" : "Developper"}
        >
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total salarie", value: data.grand_total_employee, sub: "Part salariale" },
              { label: "Total employeur", value: data.grand_total_employer, sub: "Retraite + Allocs + ATMP" },
              { label: "CNPS global du", value: data.grand_total_employee + data.grand_total_employer, highlight: true },
            ].map(({ label, value, sub, highlight }) => (
              <div key={label} className={`rounded-lg p-3 border ${highlight ? "border-violet-200 bg-violet-50" : "border-zinc-100 bg-zinc-50"}`}>
                <p className={`text-[10px] mb-1 ${highlight ? "text-violet-600" : "text-zinc-500"}`}>{label}</p>
                {sub && <p className="text-[9px] text-zinc-400 mb-1">{sub}</p>}
                <p className={`text-base font-bold ${highlight ? "text-violet-700" : "text-zinc-800"}`}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500">
                  {["Employe", "Salaire brut", "Assiette", "Retraite sal.", "Retraite pat.", "Famille", "ATMP", "Total du"].map((h, i) => (
                    <th key={h} className={`py-2.5 px-3 font-semibold ${i > 0 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {rows.map((emp, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-zinc-700">#{idx + 1}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{fmt(emp.gross_salary)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-400 italic">{fmt(emp.capped_base)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{fmt(emp.old_age_pension_employee)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{fmt(emp.old_age_pension_employer)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{fmt(emp.family_allowances_employer)}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-600">{fmt(emp.work_injury_employer)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-violet-700">{fmt(emp.total_employee + emp.total_employer)}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-50 border-t-2 border-zinc-200 font-semibold">
                  <td className="py-2.5 px-3 text-zinc-700">Total ({rows.length})</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(colTotals.gross_salary)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">—</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(colTotals.old_age_pension_employee)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(colTotals.old_age_pension_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(colTotals.family_allowances_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(colTotals.work_injury_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-violet-700">{fmt(data.grand_total_employee + data.grand_total_employer)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Taux : retraite 4,2% (sal. + pat.), allocations familiales 7% (pat.),
              ATMP 1,75 / 2,5 / 5% selon groupe. Echeance : <strong className="text-zinc-700">15 du mois suivant</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
