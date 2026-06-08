"use client";

import React, { useState } from "react";
import { ToolCall } from "../lib/types";
import { Terminal, Clock, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Cpu } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  calculate_cnps_contributions: "Calculateur CNPS",
  calculate_payroll_tax: "Calculateur IRPP",
  calculate_vat: "Calculateur TVA",
  validate_registration_number: "Validateur matricule",
  get_economic_indicator: "Banque Mondiale API",
};

interface Props { toolCalls: ToolCall[]; }

export function ToolExecutionViewer({ toolCalls }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  if (!toolCalls?.length) return null;

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-zinc-50 text-xs overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 bg-white">
        <Cpu className="w-3.5 h-3.5 text-violet-600" />
        <span className="font-semibold text-zinc-700 text-[10px] uppercase tracking-wider">
          Trace d'exécution MCP
        </span>
        <span className="ml-auto text-[9px] bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
          Stateless HTTP
        </span>
      </div>

      <div className="divide-y divide-zinc-100">
        {toolCalls.map((call, idx) => {
          const ok = call.status === "ok";
          const open = expanded === idx;
          return (
            <div key={idx}>
              <button
                onClick={() => setExpanded(open ? null : idx)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-100 transition-colors text-left cursor-pointer"
              >
                {open
                  ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                <Terminal className={`w-3.5 h-3.5 shrink-0 ${ok ? "text-violet-600" : "text-red-500"}`} />
                <span className="font-mono text-zinc-700 font-medium">{call.tool}</span>
                <span className="text-zinc-400 ml-1">{TOOL_LABELS[call.tool] || ""}</span>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="w-3 h-3" /> {call.latency_ms} ms
                  </span>
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${
                    ok ? "bg-green-50 text-green-700 border border-green-200"
                       : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {ok
                      ? <><CheckCircle2 className="w-2.5 h-2.5" /> OK</>
                      : <><AlertCircle className="w-2.5 h-2.5" /> Erreur</>}
                  </span>
                </div>
              </button>

              {open && (
                <div className="px-3 pb-3 space-y-2 bg-white border-t border-zinc-100">
                  <div className="mt-2">
                    <p className="text-[9px] uppercase tracking-wider text-zinc-400 mb-1 font-semibold">Arguments</p>
                    <pre className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-[10px] text-zinc-700 font-mono overflow-x-auto max-h-32 leading-relaxed">
                      {JSON.stringify(call.arguments, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-400 mb-1 font-semibold">Réponse MCP</p>
                    <pre className={`rounded-lg p-2.5 text-[10px] font-mono overflow-x-auto max-h-40 leading-relaxed border ${
                      ok ? "bg-zinc-50 border-zinc-200 text-zinc-700"
                         : "bg-red-50 border-red-200 text-red-700"
                    }`}>
                      {JSON.stringify(call.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}