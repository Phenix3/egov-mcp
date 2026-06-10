# Engineering Walkthrough — Liwaza eGov MCP
## Video Script — 12–14 minutes | Language: English

---

> **Before recording checklist:**
> - Browser open on https://egov-mcp-liart.vercel.app
> - VS Code open on the project
> - Terminal ready in `backend/`
> - Swagger open on https://egov-mcp.onrender.com/docs
> - GitHub repo open on https://github.com/Phenix3/egov-mcp
> - Microphone tested, screen recording started

---

## [00:00 – 01:00] SECTION 1 — Product Overview

*[SCREEN: Show the live frontend at https://egov-mcp-liart.vercel.app]*

---

"Hi, my name is Ibrahim, and in this walkthrough I'll take you through the Liwaza eGov platform
I built for this assessment — covering architecture decisions, MCP design, backend, frontend,
DevOps, testing, security, and my AI strategy.

Let me start with a quick demo to show what this product actually does.

This is Liwaza eGov — an AI-native e-government platform that allows a Cameroonian small business
to interact with its fiscal and social obligations through natural language, in both French and English.

*[TYPE in the chat: 'Calcule les cotisations CNPS pour 3 employés payés 180 000, 320 000 et 600 000 XAF, groupe de risque B']*

You can see the assistant understands the request, automatically selects the right MCP tool —
calculate_cnps_contributions — executes it with real deterministic logic, and returns a structured
card showing each employee's breakdown: the employee share, the employer share, and the totals.

*[Wait for response — show the CNPS card]*

This is not a chatbot with hardcoded answers. Every number you see came from an actual tool
execution — the CNPS rates, the capped base, all calculated from Cameroon's regulatory framework.

Let me do one more — a real external API call.

*[TYPE: 'What is the GDP evolution of Cameroon?']*

This one hits the World Bank API in real time, returns actual macro data, and displays it as
an interactive chart. All XAF — converted from USD via the BEAC fixed parity rate."

---

## [01:00 – 02:30] SECTION 2 — Architecture Decisions

*[SCREEN: Switch to VS Code, open docs/ARCHITECTURE.md — or show the ASCII diagram]*

---

"Let me explain the key architecture decisions.

The core constraint given by the assessment is: React frontend as an MCP client,
Python backend as the MCP server. My job was to make that constraint work well in practice.

*[Show the architecture diagram in ARCHITECTURE.md]*

The flow is simple:

User types a message → POST /chat → LLM Orchestrator on the backend → MCP Server → Tool execution → structured response → UI

One decision I made early: keep the LLM orchestrator on the backend, not in the browser.
I could have run the agent loop client-side — that's technically possible with some LLM SDKs.
But I rejected that approach for two reasons.

First, it would expose the LLM API key in the browser — that's a hard security no.
Second, it would move business logic out of the MCP server, which defeats the purpose of the architecture.

So: the frontend is a thin presentation layer. All intelligence lives server-side.

On monorepo versus multi-repo: I chose a monorepo — one GitHub repository with frontend/ and backend/
at the root. The advantage here is that a single pull request can update the Pydantic schema on
the backend and the TypeScript type on the frontend at the same time. These two files must stay
in sync — if they drift, the UI breaks silently. Having them in the same repo makes that drift
visible immediately in code review.

The tradeoff is that CI runs for both services on every push, even if only one changed.
At this scale, that's acceptable. At larger scale, I'd use path-based triggers in the CI."

---

## [02:30 – 04:30] SECTION 3 — MCP Design

*[SCREEN: Open backend/app/mcp_server.py in VS Code]*

---

"The MCP server is the heart of the system. Let me walk through the design.

*[Show the imports and build_mcp_server function]*

I'm using FastMCP with two important flags: stateless_http=True and json_response=True.
Stateless HTTP means each tool call is an independent HTTP request — no persistent session,
no WebSocket. This is critical for deployment on Render's free tier, which doesn't support
long-lived connections reliably. It also makes the server horizontally scalable by default.

I built six tools:

*[Scroll through the tools as you name them]*

One — calculate_cnps_contributions. This calculates pension, family allowances, and work injury
contributions for a list of employees. Fully deterministic, no I/O. I designed it to accept
multiple employees in a single call because a real payroll request for a company covers
all employees at once — not one API call per employee.

Two — calculate_payroll_tax. Computes IRPP — Cameroon's personal income tax — using the
official CGI tax brackets and applies the 30% professional expenses deduction.

Three — calculate_vat. Cameroon's VAT is 19.25% — it's actually 17.5% base plus 10% CAC surcharge.
I separated those constants in config.py so if the rate changes, there is exactly one place to update.

Four — validate_registration_number. Validates CNPS and NIU numbers against their official formats.
Important design note: this validates FORMAT only — regex-based. There is no public API from CNPS
or DGI to verify that a number actually exists in a registry. I documented this explicitly to
avoid hallucinating a non-existent government API.

Five — get_economic_indicator. This is the only tool that makes a real HTTP call — to the
World Bank API. No API key required. The response is normalized into typed Pydantic models
before it reaches the orchestrator.

Six — get_fiscal_obligations. Returns the fiscal calendar — TVA deadlines, IS quarterly payments,
CNPS monthly obligations — all sourced from the CGI Cameroun.

*[Show Pydantic schemas briefly in schemas.py]*

Every tool validates its inputs through Pydantic before executing. If the LLM sends a malformed
request — wrong type, out of range, missing field — Pydantic raises a validation error immediately.
The tool never runs with bad data.

I also wrap every tool execution in structured logging with tool name, latency in milliseconds,
and status. Reviewers can inspect this in Render's log dashboard."

---

## [04:30 – 06:00] SECTION 4 — Backend Design

*[SCREEN: Show backend/app/ folder structure, then main.py, then provider.py]*

---

"The backend is organized around three layers.

main.py is the entry point — it wires together FastAPI, the MCP server, the CORS middleware,
and the /chat endpoint. One implementation detail worth calling out:

*[Show the middleware section in main.py]*

The CORS middleware is added last, which means it wraps everything. This ensures CORS headers
appear on every response — including 4xx errors. I hit a bug early where error responses
were missing Access-Control-Allow-Origin, causing the frontend to fail silently.
Adding the middleware last was the fix.

orchestrator.py contains the LLM loop. When a user sends a message, the orchestrator
calls the LLM with the tools available. If the LLM decides to call a tool, the orchestrator
executes it and sends the results back for a second LLM call to compose the final response.

*[Show provider.py briefly]*

provider.py is a clean abstraction layer. The LLM_PROVIDER environment variable selects
which backend to use: Anthropic, OpenAI, K2Think, or any OpenAI-compatible endpoint
like Mistral, OpenRouter, or a local Ollama instance.

This matters for this product specifically. Fiscal data is sensitive. A future requirement
might be to run this entirely on-premise with a self-hosted model. The provider abstraction
means I can switch to a self-hosted Mistral or Llama by changing one environment variable —
zero code changes.

I also handle the thinking tokens from reasoning models. K2Think produces `<think>...</think>`
blocks in its output. The orchestrator extracts these, strips them from the final reply,
and if the user has enabled the 'show reasoning' toggle in the UI, returns them as a
separate field in the response."

---

## [06:00 – 07:15] SECTION 5 — Frontend Design

*[SCREEN: Switch to the live app, then briefly to VS Code → frontend/components/]*

---

"The frontend is built with Next.js 14 App Router, TypeScript, and Tailwind CSS.

*[Show the live app — welcome screen with suggestion cards]*

The primary interaction model is conversational. The welcome screen shows six suggestion cards
as a quick-start guide — each one is a realistic use case for a Cameroonian SME accountant.

*[Click on a suggestion — show tool execution viewer and structured card]*

When the assistant responds, three layers of output are shown:

First — the natural language reply, rendered with full markdown support including tables.
Second — the tool execution trace, showing exactly which MCP tool was called, with what
arguments, and how long it took. This is critical for the reviewers to verify that tools
are genuinely executing.
Third — a structured card. Each tool type has a dedicated React component: CNPSCard,
PayrollTaxCard, VATCard, EconomicIndicatorCard, ValidationCard, FiscalObligationsCard.
These present the data in a format that is immediately useful — not just a text dump.

*[Show the Brain toggle — click it]*

The reasoning toggle lets the user see the model's internal thought process when using
a reasoning model. It's off by default to keep the interface clean.

*[Show the language toggle FR/EN]*

The interface supports French and English — both in the UI labels and in the LLM system
prompt. The system prompt is parameterized with the user's language preference."

---

## [07:15 – 08:15] SECTION 6 — DevOps Decisions

*[SCREEN: Show .github/workflows/ci.yml, then render.yaml, then Dockerfile]*

---

"For deployment I chose Vercel for the frontend and Render for the backend.

The reasoning: the MCP transport I'm using is Streamable HTTP — it requires a long-running
process. Vercel's serverless functions have a maximum execution time of around 60 seconds
and cold-start behavior that's incompatible with an always-on MCP server.
Render gives me a persistent container with a public HTTPS URL, which is exactly what I need.

*[Show Dockerfile]*

The Dockerfile is minimal on purpose. Python 3.12-slim, copy requirements, pip install,
copy source. No unnecessary build steps. The CMD uses the PORT environment variable —
Render injects this dynamically, so hardcoding 8000 would break the deployment.

*[Show ci.yml briefly]*

CI runs on every push to main. It installs the Python dependencies, then runs the full
test suite with pytest. If tests fail, the pipeline fails. This means I can't accidentally
deploy broken code.

*[Show render.yaml]*

The render.yaml file declares the service configuration as code — runtime, health check path,
and environment variable keys. Secrets like the API key and the MCP auth token are marked
sync:false, meaning they must be set manually in the Render dashboard and never appear
in source control."

---

## [08:15 – 09:00] SECTION 7 — Testing Strategy

*[SCREEN: Show backend/tests/ folder in VS Code]*

---

"I have two categories of tests.

Unit tests cover the five deterministic tools: CNPS, payroll tax, VAT, validation, and
fiscal calendar. These tests verify the math directly — given a known input, assert the
exact output. They run in milliseconds, require no external services, and are the safety
net against regressions if I update a tax rate or a calculation formula.

Integration tests cover the World Bank API call and the full /chat endpoint.
The World Bank test verifies that the real HTTP call returns structured data in the
expected format. The chat test sends an actual message through the orchestrator and
verifies that the response has the right shape — reply, tool_calls, structured output.

What I don't test: the LLM's language understanding. That's probabilistic, not deterministic.
I test that the plumbing works — if the LLM selects a tool, it executes correctly and
returns valid data. The quality of the LLM's tool selection is evaluated empirically."

---

## [09:00 – 09:45] SECTION 8 — Security Considerations

*[SCREEN: Show main.py — auth middleware, CORS, config.py (env vars)]*

---

"Three security layers worth calling out.

First — the MCP endpoint is protected by Bearer token authentication. Any request to /mcp
without the correct Authorization header gets a 401. This prevents unauthorized clients
from calling fiscal calculation tools directly.

Second — the LLM API key never touches the browser. The entire orchestration loop runs
server-side. The frontend only knows the backend's /chat URL — it has no access to Anthropic
or OpenAI credentials.

Third — all fiscal inputs are validated by Pydantic before any logic runs. Gross salary
must be positive, sector risk group must be A, B, or C, number of dependents must be
non-negative. This prevents malformed inputs from reaching the calculation layer.

One known limitation I'd address in production: the current CORS configuration uses
allow_origins=star. That's acceptable for a demo but in production I would restrict origins
to the specific Vercel domain."

---

## [09:45 – 11:15] SECTION 9 — AI and LLM Strategy

*[SCREEN: Open docs/AI_STRATEGY.md]*

---

"My AI strategy is driven by what this product actually needs from a language model.

This is not a creative writing assistant. The LLM has one primary job: map a natural
language fiscal question to the correct MCP tool, extract the parameters precisely,
and explain the result clearly in French or English.

That reframes the model comparison. Raw benchmark scores matter less than tool-calling
reliability, bilingual fluency, latency, and how the model handles sensitive payroll data.

*[Scroll through the model comparison section]*

Claude Sonnet is my production recommendation. Its tool-calling is precise, it handles
French naturally, and the cost-to-quality ratio is strong for an orchestration role.
Claude Opus I'd reserve for complex multi-step reasoning — composing a full annual tax
filing from multiple tool outputs. Higher cost, higher quality — worth it selectively,
not as the default.

GPT-4o is a credible alternative. Battle-tested function calling, low latency, multimodal.
I'd keep it as a fallback to avoid single-provider lock-in.

GPT-4.1 is interesting for long-context requests — like processing a full set of accounting
entries to generate a tax filing. Longer context window at competitive cost.

For Mistral and Llama — these are strategically important, not for quality, but for
data sovereignty. Payroll data contains personal employee information. A self-hosted Mistral
or Llama model running on-premise means that data never leaves the company's infrastructure.
For a Cameroonian company concerned about GDPR-adjacent data residency, that's a real argument.

Gemini 2.5 offers a competitive cost profile for high-volume simple queries.

The architecture supports all of these through the provider abstraction. Switch LLM_PROVIDER
in the environment variable, done."

---

## [11:15 – 12:00] SECTION 10 — Future Improvements

*[SCREEN: Back to the live app for a clean finish]*

---

"A few honest observations about what I would improve.

Scalability: the current architecture is a single container on Render's free tier.
To scale from 100 to 100,000 users, I would introduce a Redis cache for deterministic
tool results — VAT on a given amount never changes, there's no reason to compute it twice.
The LLM orchestration layer would move to a queue-backed worker pool to handle concurrent
requests without blocking. The MCP server, being stateless, scales horizontally with
zero changes.

Features: the most valuable next tool would be a full payroll slip generator — taking
gross salary, employee details, and producing a complete bulletin de paie PDF
using all five existing calculation tools in sequence.

On data accuracy: several tax rates are currently marked as 'TODO confirm on official source'.
Before production, I would run a formal verification cycle with a certified Cameroonian
tax advisor and update the constants in config.py accordingly.

To summarize what I built: a production-deployed, fully functional AI-native eGov platform
with six real MCP tools, a bilingual conversational interface, structured output rendering,
multi-LLM provider support, Docker, CI/CD, and complete architecture documentation.

The code is at github.com/Phenix3/egov-mcp.
The live product is at egov-mcp-liart.vercel.app.

Thank you."

---

## END OF SCRIPT

---

## Notes de tournage

| Section | Durée cible | Action écran |
|---|---|---|
| 1 — Product Overview | 1:00 | Demo live app — TVA + GDP |
| 2 — Architecture | 1:30 | ARCHITECTURE.md + diagramme |
| 3 — MCP Design | 2:00 | mcp_server.py + schemas.py |
| 4 — Backend Design | 1:30 | main.py + orchestrator.py + provider.py |
| 5 — Frontend Design | 1:15 | App live + chat-interface.tsx |
| 6 — DevOps | 1:00 | Dockerfile + ci.yml + render.yaml |
| 7 — Testing | 0:45 | tests/ folder |
| 8 — Security | 0:45 | main.py middleware + config.py |
| 9 — AI Strategy | 1:30 | AI_STRATEGY.md |
| 10 — Future | 0:45 | Live app pour finir proprement |
| **Total** | **~12 min** | |

## Conseils

- Parle lentement et clairement — vise 120–130 mots/minute.
- Pour chaque décision : dis **"I chose X because..."** pas juste "I used X".
- Si tu rates une phrase, fais une pause de 2 secondes et reprends — facile à couper au montage.
- Pas besoin de monter la vidéo — une seule prise continue est acceptable.
- OBS Studio ou Loom fonctionnent bien pour l'enregistrement écran + voix.
