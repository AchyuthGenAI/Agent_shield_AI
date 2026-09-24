# PromptGuard Studio

PromptGuard is a working prompt injection firewall for the second ET AI Hackathon problem statement. It inspects incoming material before an AI agent uses it, removes detected instruction spans when clean content can be preserved, and quarantines content with no meaningful safe remainder.

## Try it

1. Open the app and choose **Inspect**.
2. Paste text or upload a PDF, DOCX, image, email, Markdown, HTML, JSON, code, or text file.
3. Choose **Inspect content**. Review the decision, evidence, safe handoff, and the protected workflow's extractive brief.
4. Use **Coverage** for one attack and one benign lookalike per attack category. **Architecture** explains the handoff path.

For a quick demonstration, try **Hidden web instruction** and **Clean document** in the input panel. The former is intercepted; the latter passes. Uploads are converted to text in the browser, including OCR for images and scanned PDF pages. The extracted text is sent to this app's own inspection API. No inspection content is intentionally persisted.

## Run locally

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. For a production build, run `npm run build`.

## API

`POST /api/inspect` accepts JSON:

```json
{"source":"web","content":"The material to inspect"}
```

The response includes `decision` (`allow`, `sanitize`, or `quarantine`), `risk`, `modelScore`, `findings`, `sanitizedText`, `safeHandoff`, a stage-by-stage trace, and `protectedAgent`. The server computes the protected demo from `safeHandoff` only. It is a deterministic extractive briefing with no LLM, tools, or external data source. An integrator connecting a real model must pass only `safeHandoff` when it is non-null. `GET /api/evaluate` runs the curated fixture checks. Source labels must be set by the trusted integration, not accepted from untrusted retrieved content.

Browsers that support WebMCP also expose an `inspect_content` tool, which uses the same API and updates the visible workspace. Browsers without WebMCP use the normal interface.

## Submission material

- [ARCHITECTURE.md](./ARCHITECTURE.md): flow, model and rules, trust boundaries, decisions, architecture, and scope claim.
- [EVALUATION.md](./EVALUATION.md): measured fixture results, manual file checks, and limitations.

The product is a demonstrable security layer, not a guarantee against every prompt injection. Keep downstream tool permissions, human review for high-impact actions, and source provenance controls in the agent using this API.
