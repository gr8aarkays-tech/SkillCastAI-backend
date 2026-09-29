import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuestionGeneratorService } from './question-generator.service.js';
import { AI_PROVIDER } from '../ai/interfaces/ai.provider.js';
import type { GeneratedQuestion, RoleContext } from '../ai/interfaces/ai.provider.js';
import { DocumentEntity } from '../sources/document.entity.js';
import { SourceEntity } from '../sources/source.entity.js';
import { QuestionEntity } from '../questions/question.entity.js';
import { TopicEntity } from '../questions/topic.entity.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SOURCE_ID = 'source-uuid-001';

const TESTER_QUESTIONS: GeneratedQuestion[] = [
  {
    topic: 'API Testing',
    questionText: 'What is API testing?',
    quickAnswer: 'API testing validates requests, responses, status codes and data contracts from a QA perspective.',
    detailedAnswer: 'API testing involves sending HTTP requests and asserting response codes, payloads, headers...',
    roleSpecificExplanation: 'As a Tester, you focus on request/response validation, negative test cases, auth boundary testing, and contract testing.',
    practicalExample: 'Using Postman to validate a POST /users endpoint returns 201 with correct Location header.',
    interviewAnswer: 'API testing ensures backend reliability by validating each endpoint independently from the UI.',
    followUpQuestion: 'How would you test rate limiting on an API?',
  },
];

const DEVELOPER_QUESTIONS: GeneratedQuestion[] = [
  {
    topic: 'API Development',
    questionText: 'What is API testing?',
    quickAnswer: 'API testing from a dev perspective means validating your REST controllers handle all HTTP verbs correctly.',
    detailedAnswer: 'As a developer, API testing means writing integration tests for your controllers, services...',
    roleSpecificExplanation: 'Developers focus on implementation correctness: controller routing, serialization, error handling middleware.',
    practicalExample: 'Writing a Spring Boot @WebMvcTest that POSTs to /users and asserts 201 with the user JSON body.',
    interviewAnswer: 'I implement API tests using Spring MVC Test to verify my REST endpoints respond correctly.',
    followUpQuestion: 'How do you test exception handlers in your API?',
  },
];

const ARCHITECT_QUESTIONS: GeneratedQuestion[] = [
  {
    topic: 'API Architecture',
    questionText: 'What is API testing?',
    quickAnswer: 'API testing at architecture level validates cross-cutting concerns: security, versioning, observability.',
    detailedAnswer: 'Architects care about API gateway configuration, contract-first design, SLA compliance...',
    roleSpecificExplanation: 'From an architecture standpoint, API testing validates gateway routing, service mesh policies, and SLA thresholds.',
    practicalExample: 'Using a contract testing tool like Pact to ensure downstream services honour the API contract after a schema change.',
    interviewAnswer: 'API testing is a quality gate that enforces architectural constraints like security policies and versioning contracts.',
    followUpQuestion: 'How would you implement an API versioning strategy?',
  },
];

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAiProvider = {
  generateQuestions: vi.fn(),
  generateExplanation: vi.fn(),
  generatePodcastScript: vi.fn(),
};

const mockSourceRepo = {
  findOne: vi.fn().mockResolvedValue({ id: SOURCE_ID, title: 'Test Source' }),
};

const mockDocumentRepo = {
  find: vi.fn().mockResolvedValue([
    { chunkIndex: 0, content: 'API testing is the process of validating HTTP endpoints.' },
    { chunkIndex: 1, content: 'It covers request/response validation and contract testing.' },
  ]),
};

const mockTopicRepo = {
  findOne: vi.fn().mockResolvedValue(null),
  create: vi.fn((e) => e),
  save: vi.fn((e) => Promise.resolve({ id: 'topic-id', ...e })),
  find: vi.fn().mockResolvedValue([]),
};

const mockQuestionRepo = {
  create: vi.fn((e) => e),
  save: vi.fn((entities: unknown[]) =>
    Promise.resolve((entities as object[]).map((e, i) => ({ id: `q-${i}`, ...e })))
  ),
  delete: vi.fn().mockResolvedValue({ affected: 0 }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuestionGeneratorService — role-aware generation', () => {
  let service: QuestionGeneratorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionGeneratorService,
        { provide: AI_PROVIDER, useValue: mockAiProvider },
        { provide: getRepositoryToken(DocumentEntity), useValue: mockDocumentRepo },
        { provide: getRepositoryToken(SourceEntity), useValue: mockSourceRepo },
        { provide: getRepositoryToken(TopicEntity), useValue: mockTopicRepo },
        { provide: getRepositoryToken(QuestionEntity), useValue: mockQuestionRepo },
      ],
    }).compile();

    service = module.get<QuestionGeneratorService>(QuestionGeneratorService);
  });

  it('calls AIProvider with Tester role context and stores tester-specific questions', async () => {
    const roleContext: RoleContext = { role: 'tester', experience: 'advanced', learningGoal: 'Interview prep' };
    mockAiProvider.generateQuestions.mockResolvedValueOnce(TESTER_QUESTIONS);

    const result = await service.generate(SOURCE_ID, roleContext);

    // Verify role context was passed
    const [, passedContext] = mockAiProvider.generateQuestions.mock.calls[0] as [string, RoleContext];
    expect(passedContext.role).toBe('tester');

    // Verify tester terminology in the result
    expect(result[0].roleSpecificExplanation).toContain('Tester');
    expect(result[0].roleSpecificExplanation).toContain('negative test cases');
  });

  it('calls AIProvider with Developer role context and stores developer-specific questions', async () => {
    const roleContext: RoleContext = { role: 'developer', experience: 'intermediate', learningGoal: 'Improve API skills' };
    mockAiProvider.generateQuestions.mockResolvedValueOnce(DEVELOPER_QUESTIONS);

    const result = await service.generate(SOURCE_ID, roleContext);

    const [, passedContext] = mockAiProvider.generateQuestions.mock.calls[0] as [string, RoleContext];
    expect(passedContext.role).toBe('developer');
    expect(result[0].roleSpecificExplanation).toContain('controller');
  });

  it('calls AIProvider with Architect role context and stores architecture-specific questions', async () => {
    const roleContext: RoleContext = { role: 'architect', experience: 'advanced', learningGoal: 'System design' };
    mockAiProvider.generateQuestions.mockResolvedValueOnce(ARCHITECT_QUESTIONS);

    const result = await service.generate(SOURCE_ID, roleContext);

    const [, passedContext] = mockAiProvider.generateQuestions.mock.calls[0] as [string, RoleContext];
    expect(passedContext.role).toBe('architect');
    expect(result[0].roleSpecificExplanation).toContain('architecture');
  });

  it('same question → 3 different roleSpecificExplanation values for 3 roles', async () => {
    // Run generation 3 times with 3 roles — outputs must differ
    mockAiProvider.generateQuestions
      .mockResolvedValueOnce(TESTER_QUESTIONS)
      .mockResolvedValueOnce(DEVELOPER_QUESTIONS)
      .mockResolvedValueOnce(ARCHITECT_QUESTIONS);

    const testerResult = await service.generate(SOURCE_ID, { role: 'tester', experience: 'advanced', learningGoal: '' });
    const devResult = await service.generate(SOURCE_ID, { role: 'developer', experience: 'advanced', learningGoal: '' });
    const archResult = await service.generate(SOURCE_ID, { role: 'architect', experience: 'advanced', learningGoal: '' });

    const testerExpl = testerResult[0].roleSpecificExplanation;
    const devExpl = devResult[0].roleSpecificExplanation;
    const archExpl = archResult[0].roleSpecificExplanation;

    // All three must be non-empty
    expect(testerExpl).toBeTruthy();
    expect(devExpl).toBeTruthy();
    expect(archExpl).toBeTruthy();

    // All three must be different from each other
    expect(testerExpl).not.toBe(devExpl);
    expect(devExpl).not.toBe(archExpl);
    expect(testerExpl).not.toBe(archExpl);
  });

  it('throws if AI returns no questions', async () => {
    mockAiProvider.generateQuestions.mockResolvedValueOnce([]);

    await expect(
      service.generate(SOURCE_ID, { role: 'tester', experience: 'advanced', learningGoal: '' }),
    ).rejects.toThrow('no questions');
  });
});
