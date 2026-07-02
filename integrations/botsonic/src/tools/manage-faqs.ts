import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let createFaq = SlateTool.create(spec, {
  name: 'Create FAQ',
  key: 'create_faq',
  description: `Create a new FAQ entry for a Botsonic bot. FAQs allow the bot to give precise, predetermined answers to known common questions rather than generating responses from training data.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      question: z.string().describe('The FAQ question'),
      answer: z.string().describe('The answer to the FAQ question')
    })
  )
  .output(
    z.object({
      faqId: z.string().describe('Unique identifier of the created FAQ'),
      botId: z.string().describe('Bot the FAQ belongs to'),
      question: z.string().describe('The FAQ question'),
      answer: z.string().describe('The FAQ answer'),
      status: z.string().describe('Processing status of the FAQ'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.createFaq({
      question: ctx.input.question,
      answer: ctx.input.answer
    });

    return {
      output: {
        faqId: result.id,
        botId: result.bot_id,
        question: result.question,
        answer: result.answer,
        status: result.status,
        createdAt: result.created_at
      },
      message: `Created FAQ **${result.id}**: "${result.question}"`
    };
  })
  .build();

export let listFaqs = SlateTool.create(spec, {
  name: 'List FAQs',
  key: 'list_faqs',
  description: `Retrieve all FAQ entries associated with a bot. Supports searching, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().optional().describe('Search for FAQs matching this query'),
      sortBy: z.string().optional().describe('Field to sort by (e.g. created_at, question)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      size: z.number().optional().describe('Number of results per page (1-100, default 50)')
    })
  )
  .output(
    z.object({
      faqs: z
        .array(
          z.object({
            faqId: z.string().describe('Unique FAQ identifier'),
            botId: z.string().describe('Bot the FAQ belongs to'),
            question: z.string().describe('The FAQ question'),
            answer: z.string().describe('The FAQ answer'),
            status: z.string().describe('Processing status'),
            characters: z.number().describe('Character count'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of FAQ entries'),
      total: z.number().describe('Total number of FAQs'),
      page: z.number().describe('Current page number'),
      pages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.listFaqs({
      searchQuery: ctx.input.searchQuery,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let faqs = result.items.map(f => ({
      faqId: f.id,
      botId: f.bot_id,
      question: f.question,
      answer: f.answer,
      status: f.status,
      characters: f.characters || 0,
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: {
        faqs,
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Found **${result.total}** FAQs (page ${result.page}/${result.pages}).`
    };
  })
  .build();

export let deleteFaq = SlateTool.create(spec, {
  name: 'Delete FAQ',
  key: 'delete_faq',
  description: `Delete an FAQ entry from a bot. To update an FAQ, delete the existing one and create a new one with the updated content.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      faqId: z.string().describe('The unique identifier of the FAQ to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the FAQ was successfully deleted'),
      faqId: z.string().describe('ID of the deleted FAQ')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    await client.deleteFaq(ctx.input.faqId);

    return {
      output: {
        success: true,
        faqId: ctx.input.faqId
      },
      message: `Deleted FAQ **${ctx.input.faqId}**.`
    };
  })
  .build();
