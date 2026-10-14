import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import {
  botIdSchema,
  orderSchema,
  pageSchema,
  sizeSchema,
  workspaceIdSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let createStarterQuestion = SlateTool.create(spec, {
  name: 'Create Starter Question',
  key: 'create_starter_question',
  description: `Create a new starter question for a bot. Starter questions are predefined questions shown to users to help them begin interacting with the chatbot.`,
  instructions: [
    'For account API key connections, call list_bots and provide botId. A Bot API Token connection targets the bot owning that token.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      question: z.string().min(1).describe('The starter question text'),
      answer: z.string().min(1).describe('The answer for this starter question'),
      order: orderSchema
    })
  )
  .output(
    z.object({
      starterQuestionId: z
        .string()
        .describe('Unique identifier of the created starter question'),
      botId: z.string().describe('Bot the starter question belongs to'),
      question: z.string().min(1).describe('The starter question text'),
      answer: z.string().describe('The answer text'),
      order: z.number().describe('Display order'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    let result = await client.createStarterQuestion({
      question: ctx.input.question,
      answer: ctx.input.answer,
      order: ctx.input.order
    });

    return {
      output: {
        starterQuestionId: result.id,
        botId: result.bot_id,
        question: result.question,
        answer: result.answer,
        order: result.order,
        createdAt: result.created_at
      },
      message: `Created starter question **${result.id}**: "${result.question}"`
    };
  })
  .build();

export let updateStarterQuestion = SlateTool.create(spec, {
  name: 'Update Starter Question',
  key: 'update_starter_question',
  description: `Update an existing starter question's text, answer, or display order.`,
  instructions: [
    'For account API key connections, call list_bots and provide botId. A Bot API Token connection targets the bot owning that token.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      starterQuestionId: z.string().describe('The ID of the starter question to update'),
      question: z.string().min(1).optional().describe('Updated question text'),
      answer: z.string().min(1).optional().describe('Updated answer text'),
      order: orderSchema.describe('Updated display order')
    })
  )
  .output(
    z.object({
      starterQuestionId: z.string().describe('ID of the updated starter question'),
      botId: z.string().describe('Bot the starter question belongs to'),
      question: z.string().describe('The updated question text'),
      answer: z.string().describe('The updated answer text'),
      order: z.number().describe('The updated display order'),
      updatedAt: z.string().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    if (
      ctx.input.question === undefined &&
      ctx.input.answer === undefined &&
      ctx.input.order === undefined
    ) {
      throw createApiServiceError(
        'Provide question, answer, or order to update the starter question.',
        { reason: 'empty_update' }
      );
    }

    let result = await client.updateStarterQuestion(ctx.input.starterQuestionId, {
      question: ctx.input.question,
      answer: ctx.input.answer,
      order: ctx.input.order
    });

    return {
      output: {
        starterQuestionId: result.id,
        botId: result.bot_id,
        question: result.question,
        answer: result.answer,
        order: result.order,
        updatedAt: result.updated_at
      },
      message: `Updated starter question **${result.id}**: "${result.question}"`
    };
  })
  .build();

export let listStarterQuestions = SlateTool.create(spec, {
  name: 'List Starter Questions',
  key: 'list_starter_questions',
  description: `Retrieve all starter questions for a bot. Supports searching, sorting, and pagination.`,
  instructions: [
    'For account API key connections, call list_bots and provide botId. A Bot API Token connection targets the bot owning that token.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      searchQuery: z
        .string()
        .optional()
        .describe('Search for starter questions matching this query'),
      sortBy: z.string().optional().describe('Field to sort by (default: order)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc)'),
      page: pageSchema,
      size: sizeSchema
    })
  )
  .output(
    z.object({
      starterQuestions: z
        .array(
          z.object({
            starterQuestionId: z.string().describe('Unique starter question identifier'),
            botId: z.string().describe('Bot the question belongs to'),
            question: z.string().min(1).describe('The starter question text'),
            answer: z.string().describe('The answer text'),
            order: z.number().describe('Display order'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of starter questions'),
      total: z.number().optional().describe('Total number of starter questions'),
      page: z.number().optional().describe('Current page number'),
      pages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    let result = await client.listStarterQuestions({
      searchQuery: ctx.input.searchQuery,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let starterQuestions = result.items.map(sq => ({
      starterQuestionId: sq.id,
      botId: sq.bot_id,
      question: sq.question,
      answer: sq.answer,
      order: sq.order,
      createdAt: sq.created_at,
      updatedAt: sq.updated_at
    }));

    return {
      output: {
        starterQuestions,
        total: result.total ?? undefined,
        page: result.page ?? undefined,
        pages: result.pages ?? undefined
      },
      message: `Returned **${starterQuestions.length}** starter questions${result.total == null ? '' : ` of ${result.total} total`}.`
    };
  })
  .build();

export let deleteStarterQuestion = SlateTool.create(spec, {
  name: 'Delete Starter Question',
  key: 'delete_starter_question',
  description: `Delete a starter question from a bot.`,
  instructions: [
    'For account API key connections, call list_bots and provide botId. A Bot API Token connection targets the bot owning that token.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      starterQuestionId: z.string().describe('The ID of the starter question to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      starterQuestionId: z.string().describe('ID of the deleted starter question')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    await client.deleteStarterQuestion(ctx.input.starterQuestionId);

    return {
      output: {
        success: true,
        starterQuestionId: ctx.input.starterQuestionId
      },
      message: `Deleted starter question **${ctx.input.starterQuestionId}**.`
    };
  })
  .build();
