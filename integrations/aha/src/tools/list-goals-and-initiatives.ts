import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listGoalsAndInitiatives = SlateTool.create(spec, {
  name: 'List Goals & Initiatives',
  key: 'list_goals_and_initiatives',
  description: `List strategic goals and/or initiatives from Aha!, optionally filtered by product. Returns names, statuses, progress, and reference numbers. Useful for understanding the strategic context of a product.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['goals', 'initiatives', 'both'])
        .default('both')
        .describe('Which strategic records to list'),
      productId: z.string().optional().describe('Filter by product ID or reference prefix'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return records updated since this date (ISO 8601)'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      goals: z
        .array(
          z.object({
            goalId: z.string().describe('Goal ID'),
            referenceNum: z.string().describe('Goal reference number'),
            name: z.string().describe('Goal name'),
            status: z.string().optional().describe('Workflow status name'),
            progress: z.number().optional().describe('Progress percentage'),
            url: z.string().optional().describe('Aha! URL')
          })
        )
        .optional()
        .describe('Goals (when resourceType is goals or both)'),
      initiatives: z
        .array(
          z.object({
            initiativeId: z.string().describe('Initiative ID'),
            referenceNum: z.string().describe('Initiative reference number'),
            name: z.string().describe('Initiative name'),
            status: z.string().optional().describe('Workflow status name'),
            progress: z.number().optional().describe('Progress percentage'),
            url: z.string().optional().describe('Aha! URL')
          })
        )
        .optional()
        .describe('Initiatives (when resourceType is initiatives or both)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);
    let { resourceType, productId, updatedSince, page, perPage } = ctx.input;

    let goals: any[] | undefined;
    let initiatives: any[] | undefined;
    let messages: string[] = [];

    if (resourceType === 'goals' || resourceType === 'both') {
      let result = await client.listGoals({ productId, updatedSince, page, perPage });
      goals = result.goals.map(g => ({
        goalId: g.id,
        referenceNum: g.reference_num,
        name: g.name,
        status: g.workflow_status?.name,
        progress: g.progress,
        url: g.url
      }));
      messages.push(`**${result.pagination.total_records}** goals`);
    }

    if (resourceType === 'initiatives' || resourceType === 'both') {
      let result = await client.listInitiatives({ productId, updatedSince, page, perPage });
      initiatives = result.initiatives.map(i => ({
        initiativeId: i.id,
        referenceNum: i.reference_num,
        name: i.name,
        status: i.workflow_status?.name,
        progress: i.progress,
        url: i.url
      }));
      messages.push(`**${result.pagination.total_records}** initiatives`);
    }

    return {
      output: { goals, initiatives },
      message: `Found ${messages.join(' and ')}.`
    };
  })
  .build();
