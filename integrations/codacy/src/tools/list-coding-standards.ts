import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listCodingStandards = SlateTool.create(spec, {
  name: 'List Coding Standards',
  key: 'list_coding_standards',
  description: `List coding standards configured for the organization. Coding standards define which tools and patterns are used for analysis, ensuring consistent code quality across repositories. Shows drafts and effective standards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of coding standards to return (1-100).')
    })
  )
  .output(
    z.object({
      codingStandards: z
        .array(z.any())
        .describe('List of coding standards with their configuration.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of coding standards.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listCodingStandards({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let codingStandards = response.data ?? [];

    return {
      output: {
        codingStandards,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${codingStandards.length}** coding standard(s).`
    };
  })
  .build();
