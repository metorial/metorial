import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInspectionResults = SlateTool.create(spec, {
  name: 'List Inspection Results',
  key: 'list_inspection_results',
  description: `Retrieve paginated inspection findings from data scans. Filter and sort results to identify discovered sensitive data such as PII, PFI, PHI, API tokens, and credentials.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['page', 'scan'])
        .describe(
          'Result type: "page" for paginated results or "scan" for scan-specific results'
        ),
      scanId: z.string().optional().describe('Scan ID to filter results by'),
      page: z.number().optional().describe('Page number'),
      size: z.number().optional().describe('Page size'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        results: z.array(z.any()).describe('List of inspection results'),
        totalCount: z.number().optional().describe('Total number of results')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listInspectionResults({
      type: ctx.input.type,
      scanId: ctx.input.scanId,
      page: ctx.input.page,
      size: ctx.input.size,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let data = result?.data ?? result;
    let results = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
    let totalCount = data?.totalElements ?? data?.total ?? results.length;

    return {
      output: { results, totalCount },
      message: `Found **${totalCount}** inspection result(s).`
    };
  })
  .build();
