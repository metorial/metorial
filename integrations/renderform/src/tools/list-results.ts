import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResults = SlateTool.create(spec, {
  name: 'List Render Results',
  key: 'list_results',
  description: `List previously rendered images, PDFs, and screenshots. Returns CDN URLs, dimensions, template names, and creation timestamps. Supports pagination and filtering by template.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      batch: z.string().optional().describe('Filter by render batch identifier'),
      templateId: z.string().optional().describe('Filter results by template identifier'),
      page: z.number().optional().describe('Page number for pagination (0-indexed)'),
      size: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            resultId: z.string().describe('Unique identifier for the render result'),
            href: z.string().describe('CDN URL of the rendered asset'),
            width: z.number().optional().describe('Image width in pixels'),
            height: z.number().optional().describe('Image height in pixels'),
            templateName: z.string().optional().describe('Name of the template used'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            status: z
              .string()
              .optional()
              .describe('Provider status: pending, done, or failed'),
            type: z.string().optional().describe('Provider result type'),
            errorMessage: z
              .string()
              .nullable()
              .optional()
              .describe('Provider failure reason when present')
          })
        )
        .describe('List of render results'),
      totalPages: z.number().describe('Total number of pages available'),
      totalElements: z.number().describe('Total number of results'),
      pageNumber: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.listResults({
      template: ctx.input.templateId,
      batch: ctx.input.batch,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let results = response.content.map(r => ({
      resultId: r.identifier,
      href: r.href,
      width: r.width,
      height: r.height,
      templateName: r.templateName,
      createdAt: r.createdAt,
      status: r.status,
      type: r.type,
      errorMessage: r.errorMessage
    }));

    return {
      output: {
        results,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
        pageNumber: response.number
      },
      message: `Found **${response.totalElements}** render result(s) (page ${response.number + 1} of ${response.totalPages}).`
    };
  })
  .build();
