# PromptGuard Studio

PromptGuard is a working prompt injection firewall for the second ET AI Hackathon problem statement. It inspects incoming material before an AI agent uses it, removes detected instruction spans when clean content can be preserved, and quarantines content with no meaningful safe remainder.

## Try it

1. Open the home page and choose **Enter the studio**. The home page also has three short samples you can inspect immediately.
2. Paste text or upload a PDF, DOCX, image, email, Markdown, HTML, JSON, code, or text file.
3. Enter a question for the protected analyst, then choose **Inspect content**. Review the decision, safe handoff, cited answer, and read-only tool steps.
4. Use **History** to search, reopen, or delete past inspections. **Coverage** has one attack and one benign lookalike per category. **Architecture** explains the handoff path.

For a quick demonstration, try **Hidden web instruction** and **Clean document** in the input panel. The former is intercepted; the latter passes. Uploads are converted to text in the browser, including OCR for images and scanned PDF pages. The extracted text is sent to this app's own inspection API. The site saves the latest 100 inspections run from the studio or home-page demo in this browser's IndexedDB so they can be reopened without an account. It does not send history to a separate account or history server. Users can delete one record or clear them all in the History tab; clearing browser site data also removes them.

## Run locally

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. The home page is at `/` and the inspection workspace is at `/studio`; neither requires an account. For a production build, run `npm run build`.

## Deploy on Vercel

Import `AchyuthGenAI/Agent_shield_AI` from GitHub and deploy its `main` branch. Select the **Next.js** framework preset and keep the root directory at `./`. The repository's `build` script runs `next build --webpack`; no build or output-directory override is needed. This app does not require environment variables, an external API key, or a database. Inspection history uses each visitor's browser storage, so it is not shared across devices.

## API

`POST /api/inspect` accepts JSON:

```json
{"source":"web","content":"The material to inspect","question":"What changed?"}
```

The response includes `decision` (`allow`, `sanitize`, or `quarantine`), `risk`, `modelScore`, `findings`, `sanitizedText`, `safeHandoff`, a stage-by-stage trace, and `protectedAgent`. The server runs a local tool-based analyst from `safeHandoff` only. It indexes approved passages, searches for evidence relevant to the trusted user's question, and composes an extractive answer with citations. Quarantined content is never sent to those tools. This is a real bounded workflow, but it does not call an LLM or an external service. An integrator connecting a model must pass only `safeHandoff` when it is non-null. `GET /api/evaluate` runs the curated fixture checks. Source labels and the question must be set by the trusted integration, not accepted from untrusted retrieved content.

Browsers that support WebMCP also expose an `inspect_content` tool, which uses the same API and updates the visible workspace. Browsers without WebMCP use the normal interface.

## Submission material

- [ARCHITECTURE.md](./ARCHITECTURE.md): flow, model and rules, trust boundaries, decisions, architecture, and scope claim.
- [EVALUATION.md](./EVALUATION.md): measured fixture results, manual file checks, and limitations.

The product is a demonstrable security layer, not a guarantee against every prompt injection. Keep downstream tool permissions, human review for high-impact actions, and source provenance controls in the agent using this API.
