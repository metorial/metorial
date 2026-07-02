import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      scoopTopic: z.string().optional().describe('Scoop topic keyword'),
      department: z.string().optional().describe('Department filter'),
      keywords: z.array(z.string()).optional().describe('Keywords to search for in scoops'),
      publishedDateAfter: z
        .string()
        .optional()
        .describe('Only return scoops published after this date (ISO 8601)'),
      page: z.number().min(1).optional().describe('Page number'),
      pageSize: z.number().min(1).max(100).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      scoops: z
        .array(z.record(z.string(), z.any()))
        .describe('Scoop records with details about projects, leadership changes, etc.'),
      totalResults: z.number().optional().describe('Total matching scoops')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { page, pageSize, ...searchParams } = ctx.input;

    let result = await client.searchScoops(searchParams, page, pageSize);

    let scoops = result.data || result.result || [];
    let totalResults = result.meta?.totalResults ?? result.totalResults;

    return {
      output: { scoops, totalResults },
      message: `Found **${totalResults ?? scoops.length}** scoop(s).`
    };
  })
  .build();
