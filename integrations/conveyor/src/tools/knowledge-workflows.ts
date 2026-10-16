import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let responseSchema = z.object({
  result: z.unknown().describe('Provider response with resource identifiers and metadata')
});

export let searchKnowledgeBase = SlateTool.create(spec, {
  key: 'search_knowledge_base',
  name: 'Search Knowledge Base',
  description:
    'Search curated Q&A and past questionnaire answers by text. Answers in search results are truncated to 500 characters.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      queryText: z.string().describe('Text to search for'),
      productLineIds: z
        .string()
        .optional()
        .describe('Product line IDs to filter by; discover IDs with list_product_lines')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.queryText.trim())
      throw createApiServiceError('Provide non-empty search text.');
    let result = await new ConveyorClient(ctx.auth).searchKnowledgeBase(
      ctx.input.queryText,
      ctx.input.productLineIds
    );
    return { output: { result }, message: 'Retrieved matching knowledge base content.' };
  })
  .build();

export let listQuestionTags = SlateTool.create(spec, {
  key: 'list_question_tags',
  name: 'List Question Tags',
  description:
    'List program-scoped question tags and their IDs for creating or updating curated Q&A.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number; provider default is 1'),
      perPage: z.number().optional().describe('Results per page; provider default is 100')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let result = await new ConveyorClient(ctx.auth).listQuestionTags(ctx.input);
    return { output: { result }, message: 'Retrieved question tags.' };
  })
  .build();

export let createKnowledgeBaseQuestion = SlateTool.create(spec, {
  key: 'create_knowledge_base_question',
  name: 'Create Knowledge Base Question',
  description:
    'Create a curated question and answer. Requires Knowledge Base Question write permission on the API key.'
})
  .input(
    z.object({
      content: z.string().describe('Question text'),
      answer: z.string().describe('Curated answer text'),
      status: z.enum(['verified', 'unverified']).describe('Question verification status'),
      productLineIds: z
        .array(z.string())
        .optional()
        .describe('Product IDs from list_product_lines'),
      questionAnsweringUsage: z
        .enum(['always', 'test_only', 'non_test_only'])
        .optional()
        .describe('When the answer is eligible for question answering'),
      curatorEmail: z
        .string()
        .optional()
        .describe('Curator email; must belong to a user in your organization'),
      questionTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs from list_question_tags'),
      maxVerificationAge: z
        .number()
        .optional()
        .describe('Positive custom verification period in seconds')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    if (!ctx.input.content.trim() || !ctx.input.answer.trim()) {
      throw createApiServiceError('Provide non-empty question and answer text.');
    }
    if (ctx.input.maxVerificationAge !== undefined && ctx.input.maxVerificationAge <= 0) {
      throw createApiServiceError('maxVerificationAge must be positive.');
    }
    let result = await new ConveyorClient(ctx.auth).createKnowledgeBaseQuestion(ctx.input);
    return { output: { result }, message: 'Created the curated question and answer.' };
  })
  .build();

export let updateKnowledgeBaseQuestion = SlateTool.create(spec, {
  key: 'update_knowledge_base_question',
  name: 'Update Knowledge Base Question',
  description:
    'Update an existing curated answer, verification status, product assignments, tags, or curator. Discover the question ID with list_knowledge_base_questions.',
  instructions: [
    'Product and tag assignments replace the existing assignments. Omit an assignment field to leave it unchanged.'
  ]
})
  .input(
    z.object({
      questionId: z.string().describe('Question ID from list_knowledge_base_questions'),
      answer: z.string().optional().describe('Updated answer text'),
      status: z
        .enum(['verified', 'unverified'])
        .optional()
        .describe('Updated verification status'),
      productLineIds: z
        .array(z.string())
        .optional()
        .describe('Replacement product line IDs from list_product_lines'),
      questionTagIds: z
        .array(z.string())
        .optional()
        .describe('Replacement tag IDs from list_question_tags'),
      curatorEmail: z.string().optional().describe('Curator email in your organization')
    })
  )
  .output(responseSchema)
  .handleInvocation(async ctx => {
    let { questionId, ...updates } = ctx.input;
    if (!Object.values(updates).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    if (updates.productLineIds?.length === 0 || updates.questionTagIds?.length === 0) {
      throw createApiServiceError(
        'Empty assignment lists cannot be transmitted reliably by this endpoint. Clear assignments in Conveyor, or provide the replacement IDs.'
      );
    }
    let result = await new ConveyorClient(ctx.auth).updateKnowledgeBaseQuestion(
      questionId,
      updates
    );
    return { output: { result }, message: 'Updated the curated question and answer.' };
  })
  .build();
