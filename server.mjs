import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
const effort = process.env.OPENAI_REASONING_EFFORT || "medium";
const constitutionUrl =
  process.env.CONSTITUTION_URL ||
  "https://raw.githubusercontent.com/clifer/open-inquiry-constitution/main/CONSTITUTION.md";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let cachedConstitution;

function json(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(data));
}

async function getConstitution() {
  if (cachedConstitution && Date.now() - cachedConstitution.cachedAt < 300000) {
    return cachedConstitution;
  }
  try {
    const response = await fetch(constitutionUrl);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    cachedConstitution = {
      text: await response.text(),
      source: constitutionUrl,
      sourceState: "live",
      fetchedAt: new Date().toISOString(),
      cachedAt: Date.now()
    };
  } catch {
    cachedConstitution = {
      text: await fs.readFile(join(root, "constitution.snapshot.md"), "utf8"),
      source: constitutionUrl,
      sourceState: "snapshot",
      fetchedAt: null,
      cachedAt: Date.now()
    };
  }
  return cachedConstitution;
}

async function ask(input, instructions, allowWeb = false, maxOutputTokens = 2200) {
  const request = {
    model,
    input,
    reasoning: { effort },
    max_output_tokens: maxOutputTokens
  };
  if (instructions) request.instructions = instructions;
  if (allowWeb) request.tools = [{ type: "web_search" }];
  const response = await client.responses.create(request);
  return {
    text: response.output_text?.trim() || "",
    id: response.id,
    usage: response.usage || null
  };
}

function constitutionPrompt(text) {
  return `Use the Open Inquiry Constitution below as a method of inquiry when answering the user's question. Apply it proportionately rather than mechanically. Do not force disagreement, symmetry, or a predetermined conclusion. Distinguish evidence, authority, inference, uncertainty, and scope when relevant. Trace sources when you use them. Include a concise "What could change" section when useful. The Constitution is itself challengeable.

${text}`;
}

function analysisPrompt(text) {
  return `Compare two answers from the same model to the same question. Response A is baseline. Response B used the Open Inquiry Constitution as inquiry-method instructions.

Do not assume Response B is better. Do not treat one stochastic A/B pair as proof that the Constitution caused every difference.

Explain:
1. Material changes in claims, scope, evidence, uncertainty, counterarguments, sourcing, or structure.
2. Constitution-linked differences, naming article numbers only when supported.
3. Tradeoffs or regressions in either answer.
4. What stayed substantially the same.
5. What could change this comparison.

Do not assign a winner or numeric score.

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

    if (req.method === "GET" && url.pathname === "/api/constitution") {
      return json(res, 200, await getConstitution());
    }

    if (req.method === "POST" && url.pathname === "/api/inquire") {
      const body = await readBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      if (!question) return json(res, 400, { error: "Enter a question." });
      if (!process.env.OPENAI_API_KEY) {
        return json(res, 500, { error: "OPENAI_API_KEY is not configured." });
      }

      const constitution = await getConstitution();
      const allowWeb = Boolean(body.allowWeb);
      const [baseline, guided] = await Promise.all([
        ask(question, null, allowWeb),
        ask(question, constitutionPrompt(constitution.text), allowWeb)
      ]);

      const comparisonInput = `USER QUESTION
${question}

RESPONSE A — BASELINE
${baseline.text}

RESPONSE B — CONSTITUTION-GUIDED
${guided.text}`;

      const analysis = await ask(
        comparisonInput,
        analysisPrompt(constitution.text),
        false,
        1800
      );

      return json(res, 200, {
        question,
        model,
        effort,
        webSearch: allowWeb,
        constitution: {
          source: constitution.source,
          sourceState: constitution.sourceState,
          fetchedAt: constitution.fetchedAt
        },
        baseline,
        guided,
        analysis
      });
    }

    let path = url.pathname === "/" ? "/index.html" : url.pathname;
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
  console.log(`Model: ${model} · reasoning: ${effort}`);
});
