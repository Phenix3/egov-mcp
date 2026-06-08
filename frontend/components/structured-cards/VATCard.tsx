import React, { useState } from "react";
import { VATData } from "../../lib/types";
import { Receipt, ChevronDown, ChevronUp, Info } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(n);

export function VATCard({ data }: { data: VATData }) {
  const [open, setOpen] = useState(true);
  const baseRate = data.vat_rate - (data.cac_rate || 0);
  const baseAmount = data.vat_amount - (data.cac_amount || 0);

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Calcul de TVA</p>
            <p className="text-[10px] text-zinc-400">Calcul déterministe · CGI Cameroun</p>
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
          {/* Invoice breakdown */}
          <div className="rounded-lg border border-zinc-200 overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex justify-between text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
              <span>Récapitulatif de taxe</span>
              <span>Franc CFA (XAF)</span>
            </div>

            <div className="px-4 py-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Montant hors taxe (HT)</span>
                <span className="font-medium text-zinc-800">{fmt(data.amount_excl_tax)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">TVA de base ({(baseRate * 100).toFixed(1)} %)</span>
                <span className="text-zinc-700">{fmt(baseAmount)}</span>
              </div>
              {data.cac_amount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">CAC communes ({((data.cac_rate || 0) * 100).toFixed(2)} %)</span>
                  <span className="text-zinc-700">{fmt(data.cac_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] text-zinc-400 pt-1 border-t border-dashed border-zinc-200">
                <span>Taux cumulé global</span>
                <span>{(data.vat_rate * 100).toFixed(2)} %</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Total taxes (TVA + CAC)</span>
                <span className="font-semibold text-violet-700">{fmt(data.vat_amount)}</span>
              </div>
            </div>

            <div className="px-4 py-3 bg-violet-50 border-t border-violet-100 flex justify-between items-center">
              <span className="font-semibold text-zinc-800">Total TTC (net à payer)</span>
              <span className="text-lg font-bold text-violet-700">{fmt(data.amount_incl_tax)}</span>
            </div>
          </div>

          {/* Note */}
          <div className="flex gap-2 p-3 bg-zinc-50 border border-zinc-100 rounded-lg text-[11px] text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
            <p>
              Taux cumulé <strong className="text-zinc-700">19,25 %</strong> = 17,5 % (base) + 1,75 % CAC.
              Déclaration DGI avant le <strong className="text-zinc-700">15 du mois suivant</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}