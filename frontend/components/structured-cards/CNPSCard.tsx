import React, { useState } from "react";
import { CNPSTablesData } from "../../lib/types";
import { ShieldCheck, ChevronDown, ChevronUp, Info } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n);

export function CNPSCard({ data }: { data: CNPSTablesData }) {
  const [open, setOpen] = useState(true);
  const { totals } = data;

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
            <p className="text-[10px] text-zinc-400">Calcul déterministe · Décrets Cameroun</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"
          aria-label={open ? "Réduire" : "Développer"}
        >
          {open ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>
      </div>

      {open && (
        <div className="p-4 space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total salarié", value: totals.old_age_pension_employee, sub: "Retraite 4,2 %" },
              { label: "Total employeur", value: totals.total_employer, sub: "Retraite + Allocs + ATMP" },
              { label: "CNPS global dû", value: totals.total_employee + totals.total_employer, highlight: true },
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
                  {["Employé", "Salaire brut", "Assiette", "Retraite sal.", "Retraite pat.", "Famille", "ATMP", "Total dû"].map((h, i) => (
                    <th key={h} className={`py-2.5 px-3 font-semibold ${i > 0 ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.employees.map((emp, idx) => (
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
                  <td className="py-2.5 px-3 text-zinc-700">Total ({data.employees.length})</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(totals.gross_salary)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-400">—</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(totals.old_age_pension_employee)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(totals.old_age_pension_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(totals.family_allowances_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-zinc-700">{fmt(totals.work_injury_employer)}</td>
                  <td className="py-2.5 px-3 text-right text-violet-700">{fmt(totals.total_employee + totals.total_employer)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Assiette plafonnée à <strong className="text-zinc-700">{fmt(data.ceiling)}/mois</strong> (Décret 2016/072).
              Échéance de paiement : <strong className="text-zinc-700">15 du mois suivant</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}