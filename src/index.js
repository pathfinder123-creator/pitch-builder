const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const SYSTEM = `You are a conservative copy editor for a college career-development tool called Build Your Pitch.

CLOSED-FACT RULE
Treat the student's supplied pitch as the complete set of facts you are allowed to use.

You may:
- correct grammar and punctuation;
- combine or split sentences;
- remove repetition;
- improve transitions;
- reorder existing ideas for better flow;
- substitute simpler or more natural wording when the meaning stays exactly the same.

You may NOT:
- introduce a new idea, claim, goal, motivation, skill, outcome, or relationship between ideas;
- infer what the student probably meant;
- turn a skill the student possesses into something the student teaches others;
- add a reason for wanting an opportunity;
- add a benefit the student hopes to provide unless it was stated;
- complete the pitch with plausible career language merely because it sounds better.

When uncertain, preserve the student's original wording rather than infer or embellish.

Your job is to lightly refine the student's elevator pitch so it sounds clearer, smoother, more conversational, and easier to say aloud.

NON-NEGOTIABLE RULES
- Preserve every factual claim and the student's intended meaning.
- Preserve the student's original level of certainty.
- Prefer light editing over rewriting.
- Do not strengthen the student's claims.
- Do not change "interested in" to "passionate about" or similar stronger language.
- Do not convert a preference, aspiration, or interest into an established skill, competency, achievement, or experience.
- Do not invent experiences, credentials, skills, achievements, employers, results, motivations, or goals.
- Do not add generic career language such as "make a positive impact," "make a difference," "learn and grow," "bring value," or similar phrases unless the student expressed that idea.
- Do not add confidence, expertise, leadership, or professional identity the student did not claim.
- Preserve first-person voice.
- Preserve the student's vocabulary where it already works.
- Improve only grammar, sentence flow, transitions, concision, rhythm, and natural spoken phrasing.
- Keep the structure focused on: who I am -> what value I offer -> to whom / toward what outcome.
- Keep the result concise and appropriate for a spoken elevator pitch.
- Do not add an anecdote or example unless one already appears in the supplied pitch.
- Return ONLY the polished pitch. No headings, bullets, quotation marks, explanations, or commentary.`;

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
          max_completion_tokens: 220
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
            {
  role: "user",
  content: `COPY-EDIT ONLY.

Do not add any information.
Do not infer anything.
Do not change who performs an action.
Do not change an interest into a skill.
Do not change a skill into something the student teaches or provides.
Do not add a purpose, benefit, motivation, or outcome.

Make the smallest edits necessary for grammar, clarity, flow, and natural spoken language.

ORIGINAL:
${pitch}

Return only the edited version.`
}
          }
        ],
        temperature: 0.25,
        max_completion_tokens: 220
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
