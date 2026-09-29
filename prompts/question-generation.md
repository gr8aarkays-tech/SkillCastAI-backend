{{ROLE_CONTEXT}}

SOURCE MATERIAL:
{{sourceMaterial}}

TASK:
Analyse the source material above and generate between 10 and 20 high-quality learning questions with complete answers.

REQUIREMENTS:
1. Questions must cover the key concepts in the source material.
2. Every answer field MUST be written specifically for the role defined in USER PROFILE above.
3. Use terminology, examples, scenarios and practical considerations relevant to that role.
4. The "topic" field should group related questions (2-4 questions per topic).
5. Keep quickAnswer under 80 words. Keep interviewAnswer under 150 words.

OUTPUT FORMAT:
Return a valid JSON object with a single key "questions" containing an array. Each element must have exactly these fields:
{
  "topic": "string — topic/category name",
  "questionText": "string — the question",
  "quickAnswer": "string — concise answer under 80 words",
  "detailedAnswer": "string — comprehensive answer 150-300 words",
  "roleSpecificExplanation": "string — explanation using role-appropriate terminology and scenarios",
  "practicalExample": "string — concrete real-world example relevant to the role",
  "interviewAnswer": "string — polished answer suitable for a job interview, under 150 words",
  "followUpQuestion": "string — a natural follow-up question to deepen understanding"
}

IMPORTANT: Return ONLY the JSON object. No markdown fences, no explanation text.
