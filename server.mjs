import "dotenv/config";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);

const vendorFiles = {
  "/vendor/marked.js": join(root, "node_modules", "marked", "lib", "marked.umd.js"),
  "/vendor/purify.js": join(root, "node_modules", "dompurify", "dist", "purify.min.js")
};

const providerConfig = {
  openai: {
    label: "GPT",
    model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
    reasoning: process.env.OPENAI_REASONING_EFFORT || "medium",
    apiKey: process.env.OPENAI_API_KEY
  },
  xai: {
    label: "Grok",
    model: process.env.XAI_MODEL || "grok-4.6",
    reasoning: process.env.XAI_REASONING_EFFORT || "medium",
    apiKey: process.env.XAI_API_KEY
  },
  gemini: {
    label: "Gemini",
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    reasoning: process.env.GEMINI_THINKING_LEVEL || "medium",
    apiKey: process.env.GEMINI_API_KEY
  }
};

const constitutionUrl =
  process.env.CONSTITUTION_URL ||
  "https://raw.githubusercontent.com/clifer/open-inquiry-constitution/main/CONSTITUTION.md";

const FORMAT_INSTRUCTIONS = `Write the answer as clean GitHub-Flavored Markdown.
Use short descriptive headings when they improve navigation.
Use **bold** selectively for important terms, distinctions, and conclusions.
Use bullets or numbered lists for genuinely list-like material.
Use Markdown tables only when a table is clearer than prose.
Use blockquotes only for actual quotations or clearly marked claims.
Use fenced code blocks for code.
Do not wrap the entire response in a code fence.
Prefer readable paragraphs over a wall of text.`;

const openai = providerConfig.openai.apiKey
  ? new OpenAI({ apiKey: providerConfig.openai.apiKey })
  : null;

const xai = providerConfig.xai.apiKey
  ? new OpenAI({
      apiKey: providerConfig.xai.apiKey,
      baseURL: "https://api.x.ai/v1"
    })
  : null;

const gemini = providerConfig.gemini.apiKey
  ? new GoogleGenAI({ apiKey: providerConfig.gemini.apiKey })
  : null;

let cachedConstitution;

function json(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function publicProviders() {
  return Object.entries(providerConfig).map(([id, config]) => ({
    id,
    label: config.label,
    model: config.model,
    reasoning: config.reasoning,
    configured: Boolean(config.apiKey)
  }));
}

function constitutionMetadata(text) {
  const version =
    text.match(/^#\s+Open Inquiry Constitution\s+(.+)$/m)?.[1]?.trim() || "unknown";
  const sha256 = createHash("sha256").update(text, "utf8").digest("hex");
  return { version, sha256 };
}

async function getConstitution() {
  if (cachedConstitution && Date.now() - cachedConstitution.cachedAt < 300000) {
    return cachedConstitution;
  }
  try {
    const response = await fetch(constitutionUrl);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const text = await response.text();
    cachedConstitution = {
      text,
      ...constitutionMetadata(text),
      source: constitutionUrl,
      sourceState: "live",
      fetchedAt: new Date().toISOString(),
      cachedAt: Date.now()
    };
  } catch {
    const text = await fs.readFile(join(root, "constitution.snapshot.md"), "utf8");
    cachedConstitution = {
      text,
      ...constitutionMetadata(text),
      source: constitutionUrl,
      sourceState: "snapshot",
      fetchedAt: null,
      cachedAt: Date.now()
    };
  }
  return cachedConstitution;
}

async function askResponses(client, config, input, instructions, allowWeb, maxOutputTokens) {
  const request = {
    model: config.model,
    input,
    reasoning: { effort: config.reasoning },
    max_output_tokens: maxOutputTokens
  };
  if (instructions) request.instructions = instructions;
  if (allowWeb) request.tools = [{ type: "web_search" }];

  const response = await client.responses.create(request);
  return {
    text: response.output_text?.trim() || "",
    id: response.id || null,
    usage: response.usage || null
  };
}

async function askGemini(config, input, instructions, allowWeb) {
  const request = {
    model: config.model,
    input,
    store: false,
    generation_config: {
      thinking_level: config.reasoning
    }
  };
  if (instructions) request.system_instruction = instructions;
  if (allowWeb) request.tools = [{ type: "google_search" }];

  const response = await gemini.interactions.create(request);
  return {
    text: response.output_text?.trim() || "",
    id: response.id || null,
    usage: response.usage || response.usage_metadata || null
  };
}

async function ask(provider, input, instructions, allowWeb = false, maxOutputTokens = 2200) {
  const config = providerConfig[provider];
  if (!config) throw new Error("Unknown provider.");
  if (!config.apiKey) {
    throw new Error(`${config.label} is not configured. Add its API key to the server environment.`);
  }

  if (provider === "openai") {
    return askResponses(openai, config, input, instructions, allowWeb, maxOutputTokens);
  }
  if (provider === "xai") {
    return askResponses(xai, config, input, instructions, allowWeb, maxOutputTokens);
  }
  return askGemini(config, input, instructions, allowWeb);
}

function baselinePrompt() {
  return FORMAT_INSTRUCTIONS;
}

function constitutionPrompt(text) {
  return `${FORMAT_INSTRUCTIONS}

Use the Open Inquiry Constitution below as a method of inquiry when answering the user's question. Apply it proportionately rather than mechanically. Do not force disagreement, symmetry, or a predetermined conclusion. Distinguish evidence, authority, inference, uncertainty, and scope when relevant. Trace sources when you use them. Include a concise **What could change** section when useful. The Constitution is itself challengeable.

${text}`;
}

function analysisPrompt(text) {
  return `${FORMAT_INSTRUCTIONS}

Compare two answers from the same model to the same question. Response A is baseline. Response B used the Open Inquiry Constitution as inquiry-method instructions.

Do not assume Response B is better. Do not treat one stochastic A/B pair as proof that the Constitution caused every difference.

Use these exact Markdown section headings:
## Material changes
## Constitution links
## Tradeoffs
## What stayed the same
## What could change this comparison

Under **Constitution links**, name an article only when the connection is supported. Refer to it using the exact phrase "Article N" (for example, "Article 6") so the reference app can link it to the Constitution.

Describe differences rather than assigning a winner, score, or grade.

Constitution:
${text}`;
}

async function readBody(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 20000) throw new Error("Request too large.");
  }
  return raw ? JSON.parse(raw) : {};
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && vendorFiles[url.pathname]) {
      const content = await fs.readFile(vendorFiles[url.pathname]);
      res.writeHead(200, {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "public, max-age=86400"
      });
      return res.end(content);
    }

    if (req.method === "GET" && url.pathname === "/api/config") {
      return json(res, 200, {
        providers: publicProviders(),
        formattingInstructions: FORMAT_INSTRUCTIONS
      });
    }

    if (req.method === "GET" && url.pathname === "/api/constitution") {
      return json(res, 200, await getConstitution());
    }

    if (req.method === "POST" && url.pathname === "/api/inquire") {
      const body = await readBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const provider = typeof body.provider === "string" ? body.provider : "openai";

      if (!question) return json(res, 400, { error: "Enter a question." });
      if (question.length > 6000) return json(res, 400, { error: "Question is too long." });
      if (!providerConfig[provider]) return json(res, 400, { error: "Unknown provider." });
      if (!providerConfig[provider].apiKey) {
        return json(res, 400, {
          error: `${providerConfig[provider].label} is not configured on this server.`
        });
      }

      const constitution = await getConstitution();
      const allowWeb = Boolean(body.allowWeb);
      const baselineInstructions = baselinePrompt();
      const guidedInstructions = constitutionPrompt(constitution.text);
      const comparisonInstructions = analysisPrompt(constitution.text);

      const [baseline, guided] = await Promise.all([
        ask(provider, question, baselineInstructions, allowWeb),
        ask(provider, question, guidedInstructions, allowWeb)
      ]);

      const comparisonInput = `USER QUESTION
${question}

RESPONSE A — BASELINE
${baseline.text}

RESPONSE B — CONSTITUTION-GUIDED
${guided.text}`;

      const analysis = await ask(
        provider,
        comparisonInput,
        comparisonInstructions,
        false,
        1800
      );

      const selected = providerConfig[provider];
      return json(res, 200, {
        question,
        runAt: new Date().toISOString(),
        provider,
        providerLabel: selected.label,
        model: selected.model,
        reasoning: selected.reasoning,
        webSearch: allowWeb,
        constitution: {
          source: constitution.source,
          sourceState: constitution.sourceState,
          fetchedAt: constitution.fetchedAt,
          version: constitution.version,
          sha256: constitution.sha256
        },
        method: {
          baselineInstructions,
          guidedInstructions,
          comparisonInstructions,
          comparisonInput
        },
        baseline,
        guided,
        analysis
      });
    }

    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    if (path.includes("..")) {
      res.writeHead(403);
      return res.end("Forbidden");
    }

    const file = join(publicDir, path);
    try {
      const content = await fs.readFile(file);
      res.writeHead(200, {
        "content-type": mime[extname(file)] || "application/octet-stream",
        "cache-control": "no-cache"
      });
      res.end(content);
    } catch {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
    }
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || "Unexpected server error." });
  }
}).listen(port, () => {
  console.log(`Open Inquiry UI running at http://localhost:${port}`);
  for (const provider of publicProviders()) {
    console.log(`${provider.label}: ${provider.model} · ${provider.configured ? "configured" : "missing key"}`);
  }
});
