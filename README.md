# Interview Gym — Build Your Pitch (AI-ready)

This package preserves the existing Build Your Pitch front end and adds a secure AI coaching endpoint.

## Architecture

- `index.html` — GitHub Pages front end. No API key belongs here.
- `config.js` — one-line deployment configuration for the backend URL.
- `api/coach.js` — Vercel-style serverless endpoint that calls the OpenAI Responses API.
- `package.json` — backend dependencies.
- `vercel.json` — serverless function configuration.

The serverless function has no project database and does not intentionally log student request content. The OpenAI request is configured with `store: false`.

## 1. Deploy the secure backend

Create a Vercel project using this folder (or copy `api/coach.js`, `package.json`, and `vercel.json` into a backend repository).

Set these environment variables in the backend host:

- `OPENAI_API_KEY` — your OpenAI API key. Never put this in GitHub Pages or `config.js`.
- `OPENAI_MODEL` — optional. Defaults to `gpt-5.6`.
- `ALLOWED_ORIGINS` — recommended. Comma-separated allowed front-end origins, for example `https://YOUR-ORG.github.io`.

Deploy and verify that the resulting endpoint ends in `/api/coach`.

## 2. Configure GitHub Pages

Edit `config.js` and replace:

`https://YOUR-BACKEND.vercel.app/api/coach`

with the deployed serverless endpoint.

Publish `index.html` and `config.js` together on GitHub Pages.

## 3. Test

Use a fictional student profile first. Complete Stages 1–3 and select an audience. Enter Stage 4. The page should show a loading notice and then populate:

- a first draft in the student's voice;
- vocational-clarity feedback;
- 2–3 evidence-supported strengths when available;
- human-voice feedback;
- suggested improvements;
- three pitch versions;
- developmental scores and a conversation opener.

Edit the draft and click **Coach My Revision** to test iterative coaching.

## 4. Fallback behavior

If the endpoint cannot be reached, the front end uses a conservative local fallback constructed only from the user's entered material. A visible message tells the user that the AI connection is unavailable.

## 5. Privacy review before student use

Before institutional deployment, have IT/privacy personnel review the hosting configuration, allowed origins, OpenAI project/data settings, institutional policy requirements, and the student-facing privacy notice.
Deployment initialized August 2026.
