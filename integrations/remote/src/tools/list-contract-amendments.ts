import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContractAmendments = SlateTool.create(spec, {
  name: 'List Contract Amendments',
  key: 'list_contract_amendments',
  description: `List contract amendments for employments. Filter by employment or amendment status. Returns amendment details including review status and changes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employmentId: z.string().optional().describe('Filter by employment ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by amendment status (submitted, reviewed, done, canceled)'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      contractAmendments: z
        .array(z.record(z.string(), z.any()))
        .describe('List of contract amendment records'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.listContractAmendments({
      employmentId: ctx.input.employmentId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let contractAmendments = result?.data ?? result?.contract_amendments ?? [];
    let totalCount = result?.total_count ?? contractAmendments.length;

    return {
      output: {
        contractAmendments,
        totalCount
      },
      message: `Found **${totalCount}** contract amendment(s).`
    };
  });
