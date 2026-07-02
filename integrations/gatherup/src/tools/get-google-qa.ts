import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getGoogleQA = SlateTool.create(spec, {
  name: 'Get Google Q&A',
  key: 'get_google_qa',
  description: `Retrieve Google Questions & Answers associated with business listings. Filter by business, search text, status, and labels. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.number().optional().describe('Filter by specific business ID'),
      search: z.string().optional().describe('Text query to search for specific questions'),
      locations: z.string().optional().describe('Comma-separated business IDs to filter'),
      status: z
        .string()
        .optional()
        .describe('Comma-separated statuses: open, closed, reported, removed'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      questions: z.any().describe('Dictionary of Q&A objects with nested answers'),
      totalCount: z.number().describe('Total number of questions'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getGoogleQA({
      businessId: ctx.input.businessId,
      search: ctx.input.search,
      locations: ctx.input.locations,
      status: ctx.input.status,
      page: ctx.input.page
    });

    if (data.errorCode !== undefined && data.errorCode !== 0) {
      throw new Error(
        `Failed to get Google Q&A: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: {
        questions: data.questions ?? {},
        totalCount:
          typeof data.total === 'string' ? Number.parseInt(data.total, 10) : (data.total ?? 0),
        page: data.page ?? 1,
        pages: data.pages ?? 1
      },
      message: `Retrieved Google Q&A (${data.total ?? 0} questions, page ${data.page ?? 1} of ${data.pages ?? 1}).`
    };
  })
  .build();
