import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, pagination, records } from '../lib/client';
import { spec } from '../spec';

export let searchScoops = SlateTool.create(spec, {
  name: 'Search Scoops',
  key: 'search_scoops',
  description: `Search ZoomInfo Scoops — actionable intelligence leads about internal projects, leadership moves, funding events, and pain points sourced by ZoomInfo's in-house Research Team. Use scoops to time outreach effectively and identify sales opportunities.`,
  instructions: [
    'Scoops can be filtered by type (e.g., "Project"), topic, department, or keywords.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      scoopType: z
        .string()
        .optional()
        .describe('Scoop type (e.g., "Project", "Pain Point", "Leadership", "Funding")'),
      scoopTopic: z
        .string()
        .optional()
        .describe('Scoop topic accepted value from Lookup Data'),
      department: z.string().optional().describe('Department filter'),
      keywords: z.array(z.string()).optional().describe('Keywords to search for in scoops'),
      publishedDateAfter: z
        .string()
        .optional()
        .describe(
          'Current GTM earliest inclusive publishing day (YYYY-MM-DD); legacy connections retain ISO 8601 input'
        ),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      scoops: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Scoop records with details about projects, leadership changes, etc.'),
      totalResults: z.number().optional().describe('Total matching scoops'),
      currentPage: z.number().optional().describe('Provider current page'),
      totalPages: z.number().optional().describe('Provider total pages'),
      returnedCount: z.number().optional().describe('Number of records in this response')
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchScoops(searchParams, page, pageSize);

    const scoops = records(result);
    const { totalResults, currentPage, totalPages } = pagination(result);

    return {
      output: { scoops, totalResults, currentPage, totalPages, returnedCount: scoops.length },
      message: `Found **${totalResults ?? scoops.length}** scoop(s).`
    };
  })
  .build();
