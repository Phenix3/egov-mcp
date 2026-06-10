"use client";

import React, { useState, useRef, useEffect } from "react";
import { Message, ToolCall, StructuredData } from "../lib/types";
import { sendChatMessage, checkBackendHealth } from "../lib/api";
import { StructuredCardRenderer } from "./structured-card-renderer";
import { ToolExecutionViewer } from "./tool-execution-viewer";
import {
  Send,
  Bot,
  User,
  Languages,
  AlertCircle,
  RotateCcw,
  Zap,
  Wifi,
  WifiOff,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const SUGGESTIONS = {
  fr: [
    { title: "Cotisations CNPS", text: "Calcule les cotisations CNPS de 3 employés payés 180 000, 320 000 et 600 000 XAF en groupe de risque B." },
    { title: "Salaire net & IRPP", text: "Calcule l'IRPP et le salaire net pour un brut de 450 000 XAF." },
    { title: "Déclaration TVA", text: "Calcule la TVA sur un montant de 2 500 000 XAF hors taxes." },
    { title: "Validation NIU", text: "Vérifie si le numéro NIU M123456789A est valide." },
    { title: "Obligations fiscales", text: "Quelles sont mes obligations fiscales TVA et leurs échéances ce mois-ci ?" },
    { title: "PIB du Cameroun", text: "Donne-moi l'évolution du PIB du Cameroun selon la Banque Mondiale." },
  ],
  en: [
    { title: "CNPS Contributions", text: "Calculate social contributions for employees earning 200 000 and 450 000 XAF, risk group A." },
    { title: "Net Salary & Tax", text: "Calculate payroll taxes and net salary for a gross of 350 000 XAF." },
    { title: "VAT Calculation", text: "Compute VAT and total amount for 1 200 000 XAF excl. tax." },
    { title: "NIU Validation", text: "Verify the validity of NIU number M123456789A." },
    { title: "Fiscal Obligations", text: "What are my VAT fiscal obligations and deadlines for this month?" },
    { title: "Cameroon GDP", text: "What is the GDP evolution of Cameroon according to the World Bank?" },
  ],
};

function parseTableCells(line: string): string[] {
  return line.split("|").slice(1, -1).map(c => c.trim());
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // ── Table block ──
    if (t.startsWith("|")) {
      const block: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        block.push(lines[i]);
        i++;
      }
      const parsed = block.map(parseTableCells);
      const sepIdx = parsed.findIndex(cells => cells.every(c => /^[-: ]+$/.test(c)));
      const headerRows = sepIdx > 0 ? parsed.slice(0, sepIdx) : [];
      const bodyRows = (sepIdx >= 0 ? parsed.slice(sepIdx + 1) : parsed).filter(r => r.length > 0);
      result.push(
        <div key={`tbl-${result.length}`} className="overflow-x-auto my-3 rounded-lg border border-zinc-200">
          <table className="w-full text-xs border-collapse">
            {headerRows.length > 0 && (
              <thead>
                {headerRows.map((row, ri) => (
                  <tr key={ri} className="bg-zinc-50 border-b border-zinc-200">
                    {row.map((cell, ci) => (
                      <th key={ci} className="px-3 py-2 text-left font-semibold text-zinc-700 whitespace-nowrap">
                        {parseBold(cell)}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
            )}
            <tbody className="divide-y divide-zinc-100">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-zinc-700">{parseBold(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Headings ──
    if (t.startsWith("##### "))
      result.push(<p key={i} className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-2 mb-0.5">{parseBold(t.slice(6))}</p>);
    else if (t.startsWith("#### "))
      result.push(<h5 key={i} className="text-sm font-semibold text-zinc-800 mt-3 mb-1 border-b border-zinc-100 pb-1">{parseBold(t.slice(5))}</h5>);
    else if (t.startsWith("### "))
      result.push(<h4 key={i} className="text-sm font-semibold text-zinc-900 mt-3 mb-1">{parseBold(t.slice(4))}</h4>);
    else if (t.startsWith("## "))
      result.push(<h3 key={i} className="text-base font-bold text-zinc-900 mt-4 mb-2">{parseBold(t.slice(3))}</h3>);
    else if (t.startsWith("# "))
      result.push(<h2 key={i} className="text-lg font-bold text-zinc-900 mt-4 mb-2">{parseBold(t.slice(2))}</h2>);
    else if (t === "---" || t === "***")
      result.push(<hr key={i} className="my-3 border-zinc-200" />);
    else if (t.startsWith("- ") || t.startsWith("* "))
      result.push(<li key={i} className="ml-4 list-disc text-zinc-700 my-0.5">{parseBold(t.slice(2))}</li>);
    else {
      const numMatch = t.match(/^(\d+)\.\s(.*)/);
      if (numMatch)
        result.push(<li key={i} className="ml-4 list-decimal text-zinc-700 my-0.5">{parseBold(numMatch[2])}</li>);
      else if (!t)
        result.push(<br key={i} />);
      else
        result.push(<p key={i} className="text-[13px] leading-relaxed text-zinc-700 my-1">{parseBold(t)}</p>);
    }
    i++;
  }

  return result;
}

function parseBold(text: string): React.ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-zinc-900">{part.slice(2, -2)}</strong>;
    return part.split(/(`.*?`)/g).map((sub, j) => {
      if (sub.startsWith("`") && sub.endsWith("`"))
        return <code key={j} className="bg-zinc-100 border border-zinc-200 text-violet-700 font-mono text-xs px-1.5 py-0.5 rounded">{sub.slice(1, -1)}</code>;
      return sub;
    });
  });
}

function ThinkingBlock({ content, lang }: { content: string; lang: "fr" | "en" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 overflow-hidden text-xs mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-violet-700 hover:bg-violet-100/70 transition-colors cursor-pointer"
      >
        <Brain className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium flex-1 text-left">
          {lang === "fr" ? "Raisonnement du modèle" : "Model reasoning"}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <pre className="px-3 pb-3 pt-1 text-[11px] leading-relaxed text-violet-600 whitespace-pre-wrap font-mono border-t border-violet-200">
          {content}
        </pre>
      )}
    </div>
  );
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [showThinking, setShowThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendAlive, setIsBackendAlive] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkBackendHealth().then(setIsBackendAlive);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    setInput("");
    setIsLoading(true);

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const result = await sendChatMessage(history as any, lang, showThinking);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).slice(2),
          role: "assistant",
          content: result.reply,
          timestamp: new Date().toISOString(),
          tool_calls: result.tool_calls as ToolCall[] | undefined,
          structured: result.structured as StructuredData | undefined,
          thinking: result.thinking,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = SUGGESTIONS[lang];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Toolbar ── */}
      <div className="h-[48px] border-b border-zinc-200 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-zinc-600" />
          </div>
          <span className="text-sm font-medium text-zinc-800">Assistant fiscal</span>
          {isBackendAlive !== null && (
            <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
              isBackendAlive
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {isBackendAlive ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isBackendAlive ? "En ligne" : "Hors ligne"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(null); }}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors px-2 py-1 rounded-md hover:bg-zinc-100 cursor-pointer"
              title="Nouvelle conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Réinitialiser</span>
            </button>
          )}
          <button
            onClick={() => setShowThinking((v) => !v)}
            aria-label={showThinking ? (lang === "fr" ? "Masquer la pensée" : "Hide reasoning") : (lang === "fr" ? "Afficher la pensée" : "Show reasoning")}
            title={showThinking ? (lang === "fr" ? "Masquer le raisonnement" : "Hide reasoning") : (lang === "fr" ? "Afficher le raisonnement du modèle" : "Show model reasoning")}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors border cursor-pointer ${
              showThinking
                ? "bg-violet-100 border-violet-300 text-violet-700 hover:bg-violet-200"
                : "bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
            }`}
          >
            <Brain className="w-3 h-3" />
          </button>
          <button
            onClick={() => setLang((l) => (l === "fr" ? "en" : "fr"))}
            aria-label={lang === "fr" ? "Switch to English" : "Passer en français"}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors border border-zinc-200 cursor-pointer"
          >
            <Languages className="w-3 h-3" />
            {lang.toUpperCase()}
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {messages.length === 0 ? (
          /* Welcome screen */
          <div className="h-full flex flex-col items-center justify-center text-center w-full max-w-lg mx-auto px-4 py-8 sm:py-12 space-y-6">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center shadow-sm">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-zinc-900" style={{ fontFamily: "var(--font-display)" }}>
                {lang === "fr" ? "Comment puis-je vous aider ?" : "How can I help you?"}
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                {lang === "fr"
                  ? "Posez une question sur les cotisations CNPS, l'IRPP, la TVA, la validation de matricule, les obligations fiscales ou les indicateurs économiques du Cameroun."
                  : "Ask about CNPS contributions, payroll tax, VAT, registration validation, fiscal obligations, or Cameroon economic indicators."}
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-violet-500" />
                {lang === "fr" ? "Suggestions" : "Quick start"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {suggestions.map((s) => (
                  <button
                    key={s.title}
                    onClick={() => send(s.text)}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white hover:border-violet-300 hover:bg-violet-50/60 transition-colors text-left cursor-pointer group"
                  >
                    <span className="text-xs font-semibold text-zinc-800 group-hover:text-violet-800 block mb-0.5">
                      {s.title}
                    </span>
                    <span className="text-[11px] text-zinc-400 group-hover:text-violet-600 leading-relaxed block truncate">
                      {s.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Conversation */
          <div className="space-y-5 max-w-3xl mx-auto w-full">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex gap-3 msg-in ${isUser ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-md shrink-0 flex items-center justify-center mt-0.5 ${
                    isUser ? "bg-violet-600" : "bg-zinc-100 border border-zinc-200"
                  }`}>
                    {isUser
                      ? <User className="w-3.5 h-3.5 text-white" />
                      : <Bot className="w-3.5 h-3.5 text-zinc-600" />}
                  </div>

                  <div className={`space-y-3 max-w-[90%] sm:max-w-[80%] ${isUser ? "items-end flex flex-col" : ""}`}>
                    {/* Bubble */}
                    <div className={`px-4 py-3 rounded-xl text-sm ${
                      isUser
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-white border border-zinc-200 rounded-tl-sm shadow-sm"
                    }`}>
                      {isUser
                        ? <p className="text-[13px] leading-relaxed">{msg.content}</p>
                        : <div>{renderMarkdown(msg.content)}</div>}
                    </div>

                    {/* Thinking + tool trace + structured result */}
                    {!isUser && (
                      <>
                        {msg.thinking && (
                          <ThinkingBlock content={msg.thinking} lang={lang} />
                        )}
                        {msg.tool_calls && msg.tool_calls.length > 0 && (
                          <ToolExecutionViewer toolCalls={msg.tool_calls} />
                        )}
                        {msg.structured && (
                          <StructuredCardRenderer structured={msg.structured} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading */}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-md bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-zinc-500" />
                </div>
                <div className="px-4 py-3 rounded-xl rounded-tl-sm bg-white border border-zinc-200 shadow-sm flex items-center gap-1.5">
                  <span className="dot w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span className="dot w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span className="dot w-1.5 h-1.5 rounded-full bg-violet-500" />
                  <span className="text-xs text-zinc-400 ml-1">
                    {lang === "fr" ? "Exécution des outils MCP…" : "Running MCP tools…"}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-4 mb-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div>
            <span className="font-semibold block">{lang === "fr" ? "Erreur" : "Error"}</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div className="border-t border-zinc-200 px-4 py-3 bg-white shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2 max-w-3xl mx-auto"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lang === "fr"
                ? "Posez votre question fiscale…"
                : "Ask your tax question…"
            }
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-zinc-300 rounded-xl placeholder-zinc-400 text-zinc-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all disabled:opacity-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label={lang === "fr" ? "Envoyer le message" : "Send message"}
            className="px-3.5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-zinc-400 text-center mt-2">
          {lang === "fr"
            ? "Calculs basés sur les barèmes réglementaires Cameroun 2026."
            : "Calculations based on Cameroon 2026 regulatory scales."}
        </p>
      </div>
    </div>
  );
}
