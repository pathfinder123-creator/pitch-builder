const MODEL = "@cf/zai-org/glm-4.7-flash";

const SYSTEM = `You are the final polishing editor for a college career-development tool called Build Your Pitch.

Lightly refine a student's elevator pitch so it sounds coherent, conversational, confident, and easy to say aloud.

Rules:
- Preserve every factual claim and intended meaning.
- Do not invent experiences, credentials, skills, achievements, employers, results, motivations, or goals.
- Preserve first-person voice and the student's vocabulary where it already works.
- Improve grammar, flow, transitions, rhythm, and awkward repetition.
- Prefer natural spoken language over corporate or inflated language.
- Keep the structure focused on: who I am -> value I bring -> who/where I want to contribute.
- Return ONLY the polished pitch.`;

function cors(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);

  const ok = allowed.length === 0 || allowed.includes(origin);

  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok
        ? (allowed.length ? origin : "*")
        : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json; charset=utf-8"
    }
  };
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers
  });
}

function extractText(result) {
  if (!result) return "";

  if (typeof result.response === "string") {
    return result.response;
  }

  if (typeof result.output_text === "string") {
    return result.output_text;
  }

  if (Array.isArray(result.choices)) {
    return (
      result.choices?.[0]?.message?.content ||
      result.choices?.[0]?.text ||
      ""
    );
  }

  return "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const c = cors(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: c.ok ? 204 : 403,
        headers: c.headers
      });
    }

    if (
      request.method === "GET" &&
      url.pathname === "/health"
    ) {
      return json(
        {
          ok: true,
          service: "Build Your Pitch AI Polish",
          model: MODEL,
          aiBindingPresent: Boolean(env.AI)
        },
        200,
        c.headers
      );
    }

    // Temporary AI diagnostic route
    if (
      request.method === "GET" &&
      url.pathname === "/test-ai"
    ) {
      if (!env.AI) {
        return json(
          {
            ok: false,
            stage: "binding",
            error: "Workers AI binding env.AI is missing."
          },
          500,
          c.headers
        );
      }

      try {
        const result = await env.AI.run(MODEL, {
          messages: [
            {
              role: "system",
              content: "Reply with only the word OK."
            },
            {
              role: "user",
              content: "Test."
            }
          ],
          temperature: 0,
          max_completion_tokens: 100
        });

        return json(
  {
    ok: true,
    stage: "model-call",
    model: MODEL,
    rawShapeKeys:
      result && typeof result === "object"
        ? Object.keys(result)
        : [],
    firstChoice: result?.choices?.[0] || null,
    extractedText: extractText(result)
  },
  200,
  c.headers
);
      } catch (error) {
        console.error(
          "Workers AI diagnostic error:",
          error
        );

        return json(
          {
            ok: false,
            stage: "model-call",
            model: MODEL,
            errorName: error?.name || null,
            errorMessage:
              error?.message || String(error)
          },
          500,
          c.headers
        );
      }
    }

    if (url.pathname !== "/polish") {
      return json(
        { error: "Not found." },
        404,
        c.headers
      );
    }

    if (!c.ok) {
      return json(
        { error: "Origin not allowed." },
        403,
        c.headers
      );
    }

    if (request.method !== "POST") {
      return json(
        { error: "Method not allowed." },
        405,
        c.headers
      );
    }

    try {
      if (!env.AI) {
        return json(
          {
            error:
              "Workers AI binding is unavailable."
          },
          500,
          c.headers
        );
      }

      const body = await request.json();
      const pitch = String(
        body?.pitch || ""
      ).trim();

      if (!pitch) {
        return json(
          { error: "A pitch is required." },
          400,
          c.headers
        );
      }

      const result = await env.AI.run(MODEL, {
        messages: [
          {
            role: "system",
            content: SYSTEM
          },
          {
            role: "user",
            content:
              `Polish this elevator pitch:\n\n${pitch}`
          }
        ],
        temperature: 0.25,
        max_completion_tokens: 700
      });

      const polished = extractText(result)
        .trim()
        .replace(/^["“]|["”]$/g, "")
        .trim();

      if (!polished) {
        return json(
          {
            error:
              "The AI returned no usable polished pitch."
          },
          502,
          c.headers
        );
      }

      return json(
        {
          polished,
          model: MODEL
        },
        200,
        c.headers
      );
    } catch (error) {
      console.error(
        "AI polish failure:",
        error
      );

      return json(
        {
          error:
            "AI polishing is temporarily unavailable.",
          diagnostic:
            error?.message || String(error)
        },
        500,
        c.headers
      );
    }
  }
};
