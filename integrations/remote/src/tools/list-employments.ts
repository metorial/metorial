import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEmployments = SlateTool.create(spec, {
  name: 'List Employments',
  key: 'list_employments',
  description: `List all employments (employees and contractors) managed through Remote. Filter by status or company to find specific records. Returns employment details including status, country, job title, and personal information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().optional().describe('Filter by company ID'),
      status: z
        .string()
        .optional()
        .describe('Filter by employment status (e.g., active, onboarding, offboarding)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      employments: z
        .array(z.record(z.string(), z.any()))
        .describe('List of employment records'),
      totalCount: z.number().optional().describe('Total number of matching employments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.listEmployments({
      companyId: ctx.input.companyId,
      status: ctx.input.status,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let employments = result?.data ?? result?.employments ?? [];
    let totalCount = result?.total_count ?? employments.length;

    return {
      output: {
        employments,
        totalCount
      },
      message: `Found **${totalCount}** employment(s).`
    };
  });
