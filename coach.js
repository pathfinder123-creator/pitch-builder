const SYSTEM_PROMPT = `You are the AI career coach inside Interview Gym — Build Your Pitch.

PURPOSE
Help a college student develop vocational clarity and express an authentic elevator pitch for networking, career fairs, interviews, informational interviews, and professional conversations.

FRAMEWORK
Organize your thinking around WHO I AM → WHAT I OFFER → TO WHOM.
Vocational clarity means an intentional, purpose-driven understanding of who the student is, what they can contribute, and where they want to contribute and grow.

NON-NEGOTIABLE RULES
1. Coach and edit; do not ghostwrite a new identity for the student.
2. Never invent experiences, accomplishments, skills, motivations, credentials, results, employers, education, or personal history.
3. Every named strength must be supported by evidence in the student's input. If evidence is weak, say so instead of manufacturing support.
4. Preserve the student's vocabulary, tone, and level of formality whenever possible.
5. Prefer clear conversational language over corporate, generic, inflated, or obviously AI-written wording.
6. Suggestions are choices, not commands. Explain why a change may help.
7. Prioritize Authenticity → Clarity → Relevance → Polish.
8. The final pitch should sound comfortable spoken aloud, not like a written bio or speech.
9. Adapt emphasis to the selected audience without changing who the student is.
10. If a field is blank, do not fill it with invented content. Build only from supported material.
11. Interpret form responses by meaning before combining them. Do NOT mechanically concatenate field text into sentence templates.
12. Correct grammar, punctuation, capitalization, duplicated punctuation, and sentence boundaries in all pitch versions.
13. A form response may be a fragment, full sentence, list, or shorthand. Convert it into natural spoken English without changing its factual meaning.
14. Do not add a grammatical lead-in that duplicates words already present.
15. Distinguish an outcome from a lesson. Do not write "That taught me..." unless the student actually described something learned.
16. Education shorthand must be handled conservatively. "Associate of Science, Psychology" supports wording such as "I'm studying psychology" unless the student clearly states the degree is completed.
17. The first version is the student's STARTING PITCH: it should already be coherent, grammatical, and speakable.

OUTPUT GUIDANCE
- Identify no more than 3 credible strengths.
- Keep pitch versions concise enough to speak in roughly 30–45 seconds when the source material supports that length.
- "your_voice" should make the smallest useful edits and should sound most like the student.
- "polished" may tighten structure and wording but must remain natural.
- "voice_plus_impact" may foreground the strongest supported evidence/result, but must not embellish it.
- conversation_opener should invite dialogue and fit the selected audience/goal.
- Scores are developmental, not judgments; use 1–5.
- If the user input is too thin, stay conservative and explain what information is missing rather than hallucinating.`;

const COACHING_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vocational_clarity: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string" },
        themes: { type: "array", items: { type: "string" }, maxItems: 4 },
        direction: { type: "string" }
      },
      required: ["summary", "themes", "direction"]
    },
    strengths: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          evidence: { type: "string" }
        },
        required: ["name", "evidence"]
      }
    },
    human_voice: {
      type: "object",
      additionalProperties: false,
      properties: {
        assessment: { type: "string" },
        preserve_phrases: { type: "array", items: { type: "string" }, maxItems: 4 },
        generic_phrases: { type: "array", items: { type: "string" }, maxItems: 4 }
      },
      required: ["assessment", "preserve_phrases", "generic_phrases"]
    },
    suggestions: {
      type: "array",
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          area: { type: "string" },
          current: { type: "string" },
          suggestion: { type: "string" },
          why: { type: "string" }
        },
        required: ["area", "current", "suggestion", "why"]
      }
    },
    versions: {
      type: "object",
      additionalProperties: false,
      properties: {
        your_voice: { type: "string" },
        polished: { type: "string" },
        voice_plus_impact: { type: "string" }
      },
      required: ["your_voice", "polished", "voice_plus_impact"]
    },
    conversation_opener: { type: "string" },
    scores: {
      type: "object",
      additionalProperties: false,
      properties: {
        clarity: { type: "integer", minimum: 1, maximum: 5 },
        focus: { type: "integer", minimum: 1, maximum: 5 },
        human_voice: { type: "integer", minimum: 1, maximum: 5 },
        audience_alignment: { type: "integer", minimum: 1, maximum: 5 },
        specificity: { type: "integer", minimum: 1, maximum: 5 }
      },
      required: ["clarity", "focus", "human_voice", "audience_alignment", "specificity"]
    }
  },
  required: [
    "vocational_clarity",
    "strengths",
    "human_voice",
    "suggestions",
    "versions",
    "conversation_opener",
    "scores"
  ]
};

function setCors(req, res) {
  const configured = (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || "";
  const allowed = configured.length === 0
    ? "*"
    : (configured.includes(origin) ? origin : configured[0]);

  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text) return data.output_text;
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  return "";
}

export default {
  async fetch(request) {
    const configured = (process.env.ALLOWED_ORIGINS || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get("origin") || "";
    const allowedOrigin = configured.length === 0
      ? "*"
      : (configured.includes(origin) ? origin : configured[0]);

    const corsHeaders = {
      "Access-Control-Allow-Origin": allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" }
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check: opening /api/coach in a browser should hit this.
    if (request.method === "GET") {
      return json({
        ok: true,
        service: "Build Your Pitch AI Coach",
        configured: Boolean(process.env.OPENAI_API_KEY)
      });
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed." }, 405);
    }

    if (!process.env.OPENAI_API_KEY) {
      return json({ error: "AI service is not configured." }, 500);
    }

    try {
      const raw = await request.json();
      const serialized = JSON.stringify(raw || {});
      if (serialized.length > 20000) {
        return json({ error: "Input is too large." }, 413);
      }

      const apiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-5.6",
          store: false,
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Student material:\n${serialized}` }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "build_your_pitch_coaching",
              strict: true,
              schema: COACHING_SCHEMA
            }
          }
        })
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        const msg = data?.error?.message || `OpenAI request failed with status ${apiResponse.status}.`;
        console.error("OpenAI request error:", {
          status: apiResponse.status,
          type: data?.error?.type,
          code: data?.error?.code,
          message: msg
        });
        return json({
          error: "The AI coach could not complete the request.",
          diagnostic: msg
        }, 502);
      }

      const outputText = extractOutputText(data);
      if (!outputText) {
        console.error("OpenAI response contained no output_text.");
        return json({
          error: "The AI coach returned no usable coaching.",
          diagnostic: "No output_text was present in the OpenAI response."
        }, 502);
      }

      let parsed;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        console.error("OpenAI output_text was not valid JSON.");
        return json({
          error: "The AI coach returned an unreadable response.",
          diagnostic: "The structured output was not valid JSON."
        }, 502);
      }

      return json(parsed, 200);
    } catch (error) {
      console.error("Backend error:", {
        name: error?.name,
        message: error?.message
      });
      return json({
        error: "The AI coach is temporarily unavailable.",
        diagnostic: error?.message || "Unknown backend error"
      }, 500);
    }
  }
};
