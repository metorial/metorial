import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let createStarterQuestion = SlateTool.create(spec, {
  name: 'Create Starter Question',
  key: 'create_starter_question',
  description: `Create a new starter question for a bot. Starter questions are predefined questions shown to users to help them begin interacting with the chatbot.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      question: z.string().describe('The starter question text'),
      answer: z.string().describe('The answer for this starter question'),
      order: z.number().optional().describe('Display order (lower numbers appear first)')
    })
  )
  .output(
    z.object({
      starterQuestionId: z
        .string()
        .describe('Unique identifier of the created starter question'),
      botId: z.string().describe('Bot the starter question belongs to'),
      question: z.string().describe('The starter question text'),
      answer: z.string().describe('The answer text'),
      order: z.number().describe('Display order'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

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
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      starterQuestionId: z.string().describe('The ID of the starter question to update'),
      question: z.string().optional().describe('Updated question text'),
      answer: z.string().optional().describe('Updated answer text'),
      order: z.number().optional().describe('Updated display order')
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
    let client = new BusinessClient(ctx.auth.token);

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
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z
        .string()
        .optional()
        .describe('Search for starter questions matching this query'),
      sortBy: z.string().optional().describe('Field to sort by (default: order)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc)'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Number of results per page (1-100, default 50)')
    })
  )
  .output(
    z.object({
      starterQuestions: z
        .array(
          z.object({
            starterQuestionId: z.string().describe('Unique starter question identifier'),
            botId: z.string().describe('Bot the question belongs to'),
            question: z.string().describe('The starter question text'),
            answer: z.string().describe('The answer text'),
            order: z.number().describe('Display order'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of starter questions'),
      total: z.number().describe('Total number of starter questions'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

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
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Found **${result.total}** starter questions (page ${result.page}/${result.pages}).`
    };
  })
  .build();

export let deleteStarterQuestion = SlateTool.create(spec, {
  name: 'Delete Starter Question',
  key: 'delete_starter_question',
  description: `Delete a starter question from a bot.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
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
    let client = new BusinessClient(ctx.auth.token);

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
