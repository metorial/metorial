import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let questionSchema = z.object({
  questionId: z.string().describe('Unique ID of the question'),
  question: z.string().describe('The question text'),
  answer: z.string().describe('The answer text'),
  status: z.string().describe('Verification status: "verified" or "unverified"'),
  curator: z.string().nullable().optional().describe('Who curated this question'),
  maxVerificationAge: z
    .number()
    .nullable()
    .optional()
    .describe('Maximum verification age in seconds'),
  popularity: z
    .object({
      value: z.string().optional(),
      meta: z.string().optional(),
      count: z.number().optional()
    })
    .optional()
    .describe('Popularity metrics'),
  questionDomains: z
    .array(z.string())
    .optional()
    .describe('Domains that have asked this question'),
  createdAt: z.string().describe('When the question was created'),
  updatedAt: z.string().describe('When the question was last updated')
});

export let listKnowledgeBaseQuestions = SlateTool.create(spec, {
  name: 'List Knowledge Base Questions',
  key: 'list_knowledge_base_questions',
  description: `Retrieve knowledge base Q&A pairs that Trust Center visitors have asked. Useful for understanding what security questions customers are asking and managing your knowledge base content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['verified', 'unverified'])
        .optional()
        .describe('Filter by verification status'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 100)')
    })
  )
  .output(
    z.object({
      questions: z.array(questionSchema).describe('List of knowledge base questions'),
      page: z.number().describe('Current page'),
      perPage: z.number().describe('Results per page'),
      totalPages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listKnowledgeBaseQuestions({
      status: ctx.input.status,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let questions = (data.questions || []).map((q: any) => ({
      questionId: q.id,
      question: q.question,
      answer: q.answer,
      status: q.status,
      curator: q.curator,
      maxVerificationAge: q.max_verification_age,
      popularity: q.popularity
        ? {
            value: q.popularity.value,
            meta: q.popularity.meta,
            count: q.popularity.count
          }
        : undefined,
      questionDomains: q.question_domains,
      createdAt: q.created_at,
      updatedAt: q.updated_at
    }));

    return {
      output: {
        questions,
        page: data.page,
        perPage: data.per_page,
        totalPages: data.total_pages
      },
      message: `Found **${questions.length}** knowledge base questions${ctx.input.status ? ` with status "${ctx.input.status}"` : ''} (page ${data.page} of ${data.total_pages}).`
    };
  })
  .build();
