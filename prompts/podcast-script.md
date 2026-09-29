{{ROLE_CONTEXT}}

TOPIC: {{topic}}

QUESTIONS AND ANSWERS:
{{questionsJson}}

TASK:
Create a natural, engaging two-speaker podcast conversation (Host + Expert) that covers the questions and answers above.

PODCAST STYLE GUIDELINES:
- The HOST introduces topics with curiosity, asks clarifying questions, and bridges between topics.
- The EXPERT gives deep, role-appropriate explanations using the role context above.
- Conversation must sound natural — not a robotic Q&A read-aloud.
- Include transitions, brief summaries, and occasional "that's interesting" moments.
- Keep each individual line under 300 words.
- Generate between 15 and 30 dialogue lines total.
- Start with a brief introduction of the topic.
- End with a summary and key takeaway.

OUTPUT FORMAT:
Return a valid JSON object with a single key "segments" containing an array. Each element:
{
  "speaker": "host" | "expert",
  "text": "string — what this speaker says"
}

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation text.
