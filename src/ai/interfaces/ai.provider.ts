export const AI_PROVIDER = 'AI_PROVIDER';

export interface RoleContext {
  role: string;
  experience: string;
  learningGoal: string;
}

export interface GeneratedQuestion {
  topic: string;
  questionText: string;
  quickAnswer: string;
  detailedAnswer: string;
  roleSpecificExplanation: string;
  practicalExample: string;
  interviewAnswer: string;
  followUpQuestion: string;
}

export interface ExplanationResult {
  quickAnswer: string;
  detailedAnswer: string;
  roleSpecificExplanation: string;
  practicalExample: string;
  interviewAnswer: string;
  followUpQuestion: string;
}

export interface PodcastLine {
  speaker: 'host' | 'expert';
  text: string;
}

export interface AIProvider {
  /**
   * Generate 10–20 role-specific questions from source chunks.
   */
  generateQuestions(
    sourceChunks: string,
    roleContext: RoleContext,
  ): Promise<GeneratedQuestion[]>;

  /**
   * Generate a full role-specific explanation for a single question.
   */
  generateExplanation(
    questionText: string,
    sourceContext: string,
    roleContext: RoleContext,
  ): Promise<ExplanationResult>;

  /**
   * Generate a Host+Expert podcast script from a list of Q&As.
   */
  generatePodcastScript(
    topic: string,
    questions: GeneratedQuestion[],
    roleContext: RoleContext,
  ): Promise<PodcastLine[]>;
}
