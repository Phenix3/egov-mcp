# Engineering Walkthrough — Liwaza eGov
## Video Script — 12 minutes | Simple English

---

> **Before you record:**
> - Open the live app: https://egov-mcp-liart.vercel.app
> - Open VS Code with the project
> - Open Swagger: https://egov-mcp.onrender.com/docs
> - Open GitHub: https://github.com/Phenix3/egov-mcp
> - Start screen recording + microphone

---

## [00:00 – 01:00] PART 1 — What is this product?

*[SCREEN: Show the live app]*

---

"Hello. My name is Ibrahim.

In this video, I will show you what I built, how it works, and why I made each decision.

This is Liwaza eGov.

It is an AI platform for small businesses in Cameroon.
Users can ask questions in French or English about taxes and social contributions.
The system understands the question, runs the right tool, and returns the answer.

Let me show you a quick example.

*[TYPE: 'Calcule la TVA sur 500 000 XAF']*

The assistant calls the VAT tool, calculates the correct amount, and shows a structured card.
The result is real. There is no fake data here.

*[Wait for response, show the card]*

This is what the platform does."

---

## [01:00 – 02:15] PART 2 — Architecture decisions

*[SCREEN: Open docs/ARCHITECTURE.md, show the diagram]*

---

"Let me explain the architecture.

The flow is simple:

The user sends a message.
The backend receives it.
The LLM reads the message and picks the right tool.
The tool runs and returns a result.
The LLM writes a response.
The frontend shows it.

*[Point to the diagram]*

One important decision I made: the LLM runs on the backend, not in the browser.

Why? Two reasons.

First, if the LLM runs in the browser, the API key is visible to anyone.
That is a security problem.

Second, the assessment says business logic must live in the MCP server.
Running the LLM in the browser would break that rule.

So the frontend is simple. It only shows what the backend sends.

I also chose a monorepo — one GitHub repository with both frontend and backend.
The reason is simple: the backend types and the frontend types must always match.
In a monorepo, I can change both in the same pull request.
If they are in separate repositories, they can go out of sync, and the app breaks silently."

---

## [02:15 – 04:00] PART 3 — MCP Design

*[SCREEN: Open backend/app/mcp_server.py]*

---

"Now let me show the MCP server.

*[Show the file]*

I built six tools.

Tool one: calculate_cnps_contributions.
This calculates social contributions for employees.
It accepts a list of employees with their salary and risk group.
It returns the employee share, the employer share, and the totals.

I made it accept multiple employees at once.
A real company has many employees. One tool call is better than ten.

Tool two: calculate_payroll_tax.
This calculates IRPP — the income tax on salaries.
It uses the official Cameroon CGI tax brackets.

Tool three: calculate_vat.
This calculates VAT at 19.25 percent.
That rate is 17.5 percent base plus 10 percent CAC surcharge.
The rate is in config.py. If it changes, I update it in one place only.

Tool four: validate_registration_number.
This checks if a CNPS or NIU number has the correct format.
Important: it checks the FORMAT only, using a regex.
There is no public API from CNPS or DGI to check if a number really exists.
I did not invent a fake government API. I documented this limitation clearly.

Tool five: get_economic_indicator.
This makes a real HTTP call to the World Bank API.
No fake data. No cache. A real request every time.

Tool six: get_fiscal_obligations.
This returns the fiscal calendar for Cameroon.
VAT deadlines, income tax deadlines, CNPS payment dates.
All from the official CGI Cameroon.

*[Show a Pydantic schema briefly]*

Every tool uses Pydantic to validate inputs.
If the LLM sends a wrong type or a missing field, Pydantic stops it immediately.
The tool never runs with bad data."

---

## [04:00 – 05:15] PART 4 — Backend design

*[SCREEN: Show main.py, then orchestrator.py, then provider.py]*

---

"The backend has three main files.

main.py is the entry point. It starts FastAPI, mounts the MCP server, and defines the /chat endpoint.

*[Show the CORS middleware section]*

One detail: I add CORS middleware last in the stack.
This makes it wrap everything — including error responses.
If I add it first, error responses like 401 or 422 have no CORS header.
The browser blocks them. I found this bug early and fixed it.

orchestrator.py runs the LLM loop.
It sends the user message to the LLM.
If the LLM calls a tool, the orchestrator runs it and sends the result back.
Then the LLM writes the final answer.

*[Show provider.py]*

provider.py is an abstraction layer for the LLM.
I can change the LLM provider with one environment variable.
Anthropic, OpenAI, K2Think, Mistral, OpenRouter — all supported.

Why does this matter?
Payroll data is sensitive. Some companies want to process it on their own servers.
With this abstraction, they can switch to a self-hosted model with zero code changes.
Just change LLM_PROVIDER in the environment file."

---

## [05:15 – 06:15] PART 5 — Frontend design

*[SCREEN: Show the live app]*

---

"The frontend is built with Next.js, TypeScript, and Tailwind CSS.

*[Show the welcome screen with suggestion cards]*

The welcome screen shows six example questions.
They are real use cases for a small business in Cameroon.
The user can click one to start quickly.

*[Click a suggestion, wait for the response]*

Each assistant response has three parts.

First, the text reply in natural language.

Second, the tool execution trace.
This shows which tool was called, the arguments, and how long it took.
Reviewers can see that the tools are real.

Third, a structured card.
Each tool has a dedicated card component.
CNPS card, VAT card, payroll tax card, economic indicator card.
The data is formatted clearly, not just raw JSON.

*[Show the Brain toggle]*

This button shows the model's reasoning.
When using a reasoning model like K2Think, the model thinks before answering.
I can show or hide that reasoning in the UI.

*[Show the language toggle]*

This button switches between French and English.
The system prompt changes too, so the assistant responds in the right language."

---

## [06:15 – 07:00] PART 6 — DevOps decisions

*[SCREEN: Show Dockerfile, then .github/workflows/ci.yml]*

---

"I deployed the frontend on Vercel and the backend on Render.

Why Render for the backend?
The MCP transport I use is Streamable HTTP.
It needs a server that runs all the time.
Vercel serverless functions have a time limit and no persistent process.
Render gives me a container that stays alive.

*[Show the Dockerfile]*

The Dockerfile is simple: Python 3.12, install requirements, copy code, start server.
One important line: the CMD uses PORT as an environment variable.
Render injects PORT dynamically. If I hardcode 8000, the app does not start.

*[Show ci.yml]*

The CI pipeline runs on every push.
It installs dependencies and runs all tests.
If any test fails, the pipeline fails.
I cannot push broken code without noticing."

---

## [07:00 – 07:45] PART 7 — Testing strategy

*[SCREEN: Show backend/tests/ folder]*

---

"I have two types of tests.

Unit tests cover the five deterministic tools.
For each tool, I give a known input and check the exact output.
For example: VAT on 100,000 XAF must always return 19,250 XAF.
These tests are fast and need no internet connection.

Integration tests cover the World Bank API and the full /chat endpoint.
The World Bank test checks that a real HTTP call returns data in the correct format.
The chat test sends a real message and checks the response structure.

What I do not test: the quality of the LLM's understanding.
That is probabilistic. I cannot assert that the LLM always picks the right tool.
I test that when a tool is called, it returns correct results."

---

## [07:45 – 08:30] PART 8 — Security

*[SCREEN: Show main.py — the auth middleware section, then config.py]*

---

"Three security points.

First: the MCP endpoint requires a Bearer token.
Any request without the right token gets a 401 error.
This blocks unauthorized access to the calculation tools.

Second: the LLM API key stays on the server.
The frontend never sees it.
The frontend only calls /chat. It has no access to Anthropic or OpenAI.

Third: Pydantic validates all inputs.
Salary must be positive. Risk group must be A, B, or C.
A bad input never reaches the calculation logic.

One thing I would improve in production:
CORS is currently open to all origins — allow_origins star.
In production, I would restrict it to the Vercel domain only."

---

## [08:30 – 10:00] PART 9 — AI and LLM strategy

*[SCREEN: Open docs/AI_STRATEGY.md]*

---

"My LLM strategy starts with one question: what does this product need from a language model?

This is not a creative assistant.
The LLM has one job: read a fiscal question, pick the right tool, extract the parameters, explain the result.

So the most important qualities are: reliable tool calling, good French and English, and low cost.

*[Scroll slowly through the strategy doc]*

Claude Sonnet is my recommendation for production.
Tool calling is precise. French is natural. The cost is reasonable.

Claude Opus I would use only for complex tasks — like generating a full annual tax filing from multiple tool results. Higher quality, higher cost. Not for every request.

GPT-4o is a strong alternative.
Tool calling is reliable. Latency is low.
I keep it as a backup to avoid depending on one provider.

Mistral and Llama are important for a different reason: self-hosting.
Payroll data contains personal employee information.
A company can run Mistral on its own server.
The data never leaves the company.
My provider abstraction supports this today with zero code changes.

Gemini 2.5 is competitive on cost for simple high-volume queries.

The key point: I built the provider layer so the LLM is replaceable.
The product does not depend on one model or one company."

---

## [10:00 – 10:45] PART 10 — Future improvements

*[SCREEN: Go back to the live app]*

---

"Three things I would improve next.

First, caching.
VAT on 100,000 XAF is always 19,250 XAF.
I can cache deterministic results in Redis.
This removes unnecessary computation and makes the system faster at scale.

Second, a payroll slip generator.
This would take employee data, run all five tools together, and produce a complete pay slip PDF.
It is the most useful feature for a small business.

Third, tax rate verification.
Some rates in the code are marked 'TODO confirm on official source.'
Before production, I would verify every rate with a certified Cameroonian tax advisor.

To finish: the live product is at egov-mcp-liart.vercel.app.
The code is at github.com/Phenix3/egov-mcp.

Thank you."

---

## END

---

## Quick reference — key phrases to practice

These sentences appear many times. Practice them until they feel natural:

| Phrase | Utilisation |
|---|---|
| *"I chose X because..."* | Avant chaque décision technique |
| *"The reason is..."* | Pour expliquer un choix |
| *"This is important because..."* | Pour souligner un point clé |
| *"In production, I would..."* | Pour les améliorations futures |
| *"There is no fake data."* | Part 1 et Part 4 |

## Timing guide

| Part | Start | Duration |
|---|---|---|
| 1 — Product | 0:00 | 1:00 |
| 2 — Architecture | 1:00 | 1:15 |
| 3 — MCP Design | 2:15 | 1:45 |
| 4 — Backend | 4:00 | 1:15 |
| 5 — Frontend | 5:15 | 1:00 |
| 6 — DevOps | 6:15 | 0:45 |
| 7 — Testing | 7:00 | 0:45 |
| 8 — Security | 7:45 | 0:45 |
| 9 — AI Strategy | 8:30 | 1:30 |
| 10 — Future | 10:00 | 0:45 |
| **Total** | | **~11 min** |
