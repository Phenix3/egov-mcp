import React from "react";
import { ValidationData } from "../../lib/types";
import { CheckCircle2, XCircle, FileSearch, AlertTriangle } from "lucide-react";

export function ValidationCard({ data }: { data: ValidationData }) {
  const ok = data.valid;

  return (
    <div className={`w-full rounded-xl border bg-white shadow-sm overflow-hidden my-3 ${
      ok ? "border-green-200" : "border-red-200"
    }`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        ok ? "border-green-100 bg-green-50" : "border-red-100 bg-red-50"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
            ok ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200"
          }`}>
            <FileSearch className={`w-3.5 h-3.5 ${ok ? "text-green-700" : "text-red-700"}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Vérification matricule {data.type}</p>
            <p className="text-[10px] text-zinc-400">Analyse de structure · Conformité syntaxique</p>
          </div>
        </div>

        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          ok
            ? "bg-green-100 text-green-800 border-green-200"
            : "bg-red-100 text-red-800 border-red-200"
        }`}>
          {ok
            ? <><CheckCircle2 className="w-3.5 h-3.5" /> Conforme</>
            : <><XCircle className="w-3.5 h-3.5" /> Non conforme</>}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Numbers */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Numéro saisi", value: data.number },
            { label: "Format normalisé", value: data.normalized || "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">{label}</p>
              <p className="text-sm font-mono font-semibold text-zinc-800 break-all">{value}</p>
            </div>
          ))}
        </div>

        {/* Result detail */}
        {ok ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-[11px] text-green-800 leading-relaxed">
            <p className="font-semibold mb-1">Structure validée avec succès</p>
            <p>Le format correspond au standard {data.type} camerounais.</p>
            {data.pattern_description && (
              <p className="mt-1 text-green-600">Modèle : {data.pattern_description}</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-[11px] text-red-800">
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
              <div>
                <p className="font-semibold mb-1">Erreur de syntaxe</p>
                <p className="leading-relaxed">{data.reason || `Le numéro ne correspond pas au format ${data.type}.`}</p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          Validation hors ligne par analyse de motifs (regex). Confirme le format, pas l'existence dans le registre public.
        </p>
      </div>
    </div>
  );
}