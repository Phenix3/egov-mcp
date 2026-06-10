"use client";

import React, { useState } from "react";
import { EconomicIndicatorData } from "../../lib/types";
import { Globe, TrendingUp, TrendingDown, Table, BarChart2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Parité fixe BEAC — 1 USD = 655,957 XAF (inchangée depuis 1999)
const BEAC_RATE = 655.957;

// Vrai pour les indicateurs monétaires en USD (PIB nominal/constant) — pas les taux (ZG/ZS)
function isMonetaryUSD(code: string): boolean {
  return code.includes("GDP") && !code.includes(".ZG") && !code.includes(".ZS");
}

function formatValue(val: number | null, code: string): string {
  if (val === null) return "N/A";
  if (isMonetaryUSD(code)) {
    const mdsXaf = (val * BEAC_RATE) / 1e9;
    return `${Math.round(mdsXaf).toLocaleString("fr-FR")} Mds XAF`;
  }
  if (code.includes("POP")) return `${(val / 1e6).toFixed(2)} M hab.`;
  if (code.includes("ZG") || code.includes("ZS")) return `${val.toFixed(2)} %`;
  return val.toLocaleString("fr-FR");
}

function toChartValue(val: number, code: string): number {
  if (isMonetaryUSD(code)) return parseFloat(((val * BEAC_RATE) / 1e9).toFixed(0));
  if (code.includes("POP")) return parseFloat((val / 1e6).toFixed(2));
  return parseFloat(val.toFixed(2));
}

function unitLabel(code: string): string {
  if (isMonetaryUSD(code)) return "Mds XAF";
  if (code.includes("POP")) return "M hab.";
  if (code.includes("ZG") || code.includes("ZS")) return "%";
  return "";
}

export function EconomicIndicatorCard({ data }: { data: EconomicIndicatorData }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const clean = data.observations
    .filter((o) => o.value !== null)
    .sort((a, b) => Number(a.year) - Number(b.year));

  const chartData = clean.map((o) => ({
    year: String(o.year),
    valeur: toChartValue(o.value as number, data.indicator_code),
    formatted: formatValue(o.value, data.indicator_code),
  }));

  const trend = clean.length >= 2
    ? (() => {
        const oldest = clean[0].value as number;
        const newest = clean[clean.length - 1].value as number;
        const pct = oldest !== 0 ? ((newest - oldest) / oldest) * 100 : 0;
        return { pct, up: pct >= 0 };
      })()
    : null;

  return (
    <div className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden my-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-zinc-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900 leading-snug">{data.indicator_name}</p>
            <p className="text-[10px] text-zinc-400">Banque Mondiale · Données réelles · Cameroun</p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 self-start sm:self-center shrink-0">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                view === v
                  ? "bg-white text-violet-700 shadow-sm border border-zinc-200"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {v === "chart" ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
              {v === "chart" ? "Graphique" : "Données"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Trend pill */}
        {trend && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Période</p>
              <p className="font-semibold text-zinc-700 mt-0.5">
                {clean[0].year} — {clean[clean.length - 1].year}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Variation</p>
              <p className={`flex items-center gap-1 justify-end font-bold mt-0.5 ${
                trend.up ? "text-green-700" : "text-red-600"
              }`}>
                {trend.up
                  ? <TrendingUp className="w-3.5 h-3.5" />
                  : <TrendingDown className="w-3.5 h-3.5" />}
                {trend.up ? "+" : ""}{trend.pct.toFixed(1)} %
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {view === "chart" && (
          <div className="h-56 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F5" vertical={false} />
                  <XAxis dataKey="year" stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #E4E4E7",
                      borderRadius: "8px",
                      fontSize: "11px",
                      color: "#18181B",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    }}
                    labelStyle={{ fontWeight: 600, color: "#7C3AED" }}
                    formatter={(v) => [`${v} ${unitLabel(data.indicator_code)}`, "Valeur"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="valeur"
                    stroke="#7C3AED"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#violetGrad)"
                    dot={{ r: 3, fill: "#7C3AED", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "#7C3AED" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-zinc-200 text-zinc-400 text-xs">
                Données insuffisantes
              </div>
            )}
          </div>
        )}

        {/* Table */}
        {view === "table" && (
          <div className="overflow-x-auto rounded-lg border border-zinc-200 max-h-56 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-zinc-50 border-b border-zinc-200">
                <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="py-2.5 px-3 font-semibold text-left">Année</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Valeur</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Variation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {clean.map((obs, i) => {
                  const prev = i > 0 ? clean[i - 1].value : null;
                  const diff = prev && obs.value !== null && prev !== 0
                    ? ((obs.value - prev) / prev) * 100
                    : null;
                  return (
                    <tr key={i} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-zinc-700">{obs.year}</td>
                      <td className="py-2.5 px-3 text-right text-zinc-600 font-mono">
                        {formatValue(obs.value, data.indicator_code)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {diff !== null ? (
                          <span className={`font-mono text-[10px] ${diff >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {diff >= 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(1)} %
                          </span>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center text-[10px] text-zinc-400 pt-1">
          <span>Code : <span className="font-mono text-zinc-600">{data.indicator_code}</span></span>
          <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Cameroun (CMR)</span>
        </div>
      </div>
    </div>
  );
}