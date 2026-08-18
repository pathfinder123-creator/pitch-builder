import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const Strength = z.object({
  name: z.string(),
  evidence: z.string(),
});

const Suggestion = z.object({
  area: z.string(),
  current: z.string(),
  suggestion: z.string(),
  why: z.string(),
});

const Coaching = z.object({
  vocational_clarity: z.object({
    summary: z.string(),
    themes: z.array(z.string()).max(4),
    direction: z.string(),
  }),
  strengths: z.array(Strength).max(3),
  human_voice: z.object({
    assessment: z.string(),
    preserve_phrases: z.array(z.string()).max(4),
    generic_phrases: z.array(z.string()).max(4),
  }),
  suggestions: z.array(Suggestion).max(4),
  versions: z.object({
    your_voice: z.string(),
    polished: z.string(),
    voice_plus_impact: z.string(),
  }),
  conversation_opener: z.string(),
  scores: z.object({
    clarity: z.number().int().min(1).max(5),
    focus: z.number().int().min(1).max(5),
    human_voice: z.number().int().min(1).max(5),
    audience_alignment: z.number().int().min(1).max(5),
    specificity: z.number().int().min(1).max(5),
  }),
});

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
14. Do not add a grammatical lead-in that duplicates words already present. For example, if the student writes "I want to help people," do not produce "I'm interested in I want to help people."
15. Distinguish an outcome from a lesson. Do not write "That taught me..." unless the student actually described something learned.
16. Education shorthand must be handled conservatively. "Associate degree, Psychology field of study" supports wording such as "I'm studying psychology"; it does not necessarily support "I have an associate degree in psychology."
17. The first version is the student's STARTING PITCH: it should already be coherent, grammatical, and speakable. Coaching should improve an intelligible draft, not rescue broken template assembly.

OUTPUT GUIDANCE
- Identify no more than 3 credible strengths.
- Keep pitch versions concise enough to speak in roughly 30–45 seconds when the source material supports that length.
- "your_voice" should make the smallest useful edits and should sound most like the student.
- "polished" may tighten structure and wording but must remain natural.
- "voice_plus_impact" may foreground the strongest supported evidence/result, but must not embellish it.
- conversation_opener should invite dialogue and fit the selected audience/goal.
- Scores are developmental, not judgments; use 1–5.
- If the user input is incompatible with the task or too thin, return conservative language, empty arrays where appropriate, and explain what information is missing rather than hallucinating.`;

function cors(req, res) {
  const configured = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || "";
  const allowed = configured.length === 0 ? "*" : (configured.includes(origin) ? origin : configured[0]);
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "AI service is not configured." });

  try {
    const raw = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const serialized = JSON.stringify(raw || {});
    if (serialized.length > 20000) return res.status(413).json({ error: "Input is too large." });

    const response = await openai.responses.parse({
      model: process.env.OPENAI_MODEL || "gpt-5.6",
      store: false,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Student material:\n${serialized}` },
      ],
      text: { format: zodTextFormat(Coaching, "build_your_pitch_coaching") },
    });

    if (!response.output_parsed) {
      return res.status(502).json({ error: "The AI coach did not return usable coaching." });
    }
    return res.status(200).json(response.output_parsed);
 } catch (error) {
  console.error("OpenAI error:", {
    name: error?.name,
    status: error?.status,
    code: error?.code,
    message: error?.message
  });
