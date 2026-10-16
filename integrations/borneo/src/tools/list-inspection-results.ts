import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList, readTotal } from '../lib/responses';
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
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      type: z
        .enum(['page', 'scan'])
        .describe(
          'Result type: "page" for paginated results or "scan" for scan-specific results'
        ),
      scanId: z.string().optional().describe('Scan ID to filter results by'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe('Zero-based page number; prefer nextToken for efficient paging.'),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.listInspectionResults({
      type: ctx.input.type,
      scanId: ctx.input.scanId,
      page: ctx.input.page,
      nextToken: ctx.input.nextToken,
      size: ctx.input.size,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder
    });

    let data = result;
    let results = readList(data, 'inspectionResults');
    let totalCount = readTotal(data, 'count');

    return {
      output: { results, totalCount, ...listMetadata(data) },
      message: `Found **${results.length}** inspection result(s).`
    };
  })
  .build();
