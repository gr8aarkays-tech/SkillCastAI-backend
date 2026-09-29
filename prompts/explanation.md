{{ROLE_CONTEXT}}

SOURCE MATERIAL CONTEXT:
{{sourceMaterial}}

QUESTION:
{{questionText}}

TASK:
Generate a complete, role-specific explanation for the question above.
Tailor every field specifically for someone with the role and experience level defined in USER PROFILE.

OUTPUT FORMAT:
Return a valid JSON object with exactly these fields:
{
  "quickAnswer": "string — concise answer under 80 words, role-appropriate",
  "detailedAnswer": "string — comprehensive answer 150-300 words",
  "roleSpecificExplanation": "string — uses role-specific terminology, tools, and scenarios",
  "practicalExample": "string — concrete example from the perspective of the role",
  "interviewAnswer": "string — polished interview answer under 150 words",
  "followUpQuestion": "string — a natural follow-up question"
}

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation text.
Do NOT invent facts not supported by the source material.
