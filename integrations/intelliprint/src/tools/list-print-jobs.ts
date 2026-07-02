import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPrintJob, printJobSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listPrintJobs = SlateTool.create(spec, {
  name: 'List Print Jobs',
  key: 'list_print_jobs',
  description: `List and search print jobs with filtering and sorting. Filter by confirmation status, mail type, reference, letter status, and test mode. Supports pagination for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(10)
        .describe('Number of results to return (1-1000)'),
      skip: z.number().default(0).describe('Number of results to skip for pagination'),
      sortField: z
        .enum(['created', 'confirmed_at', 'reference', 'type', 'letters', 'pages', 'sheets'])
        .optional()
        .describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
      testmode: z.boolean().optional().describe('Filter for test mode print jobs only'),
      confirmed: z.boolean().optional().describe('Filter by confirmation status'),
      type: z.enum(['letter', 'postcard']).optional().describe('Filter by mail type'),
      reference: z.string().optional().describe('Filter by reference'),
      letterStatus: z
        .string()
        .optional()
        .describe('Filter by letter status (comma-separated for multiple)')
    })
  )
  .output(
    z.object({
      printJobs: z.array(printJobSchema).describe('List of print jobs'),
      totalAvailable: z.number().describe('Total number of matching print jobs'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      sort_order: ctx.input.sortOrder
    };

    if (ctx.input.sortField) params.sort_field = ctx.input.sortField;
    if (ctx.input.testmode !== undefined) params.testmode = ctx.input.testmode;
    if (ctx.input.confirmed !== undefined) params.confirmed = ctx.input.confirmed;
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.reference) params.reference = ctx.input.reference;
    if (ctx.input.letterStatus) params['letters.status'] = ctx.input.letterStatus;

    let result = await client.listPrintJobs(params);

    return {
      output: {
        printJobs: result.data.map(mapPrintJob),
        totalAvailable: result.total_available,
        hasMore: result.has_more
      },
      message: `Found **${result.total_available}** print job(s). Showing ${result.data.length} result(s).`
    };
  })
  .build();
