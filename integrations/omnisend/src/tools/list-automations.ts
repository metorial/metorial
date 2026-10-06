import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `List automation workflows configured in Omnisend. Returns details about each automation including name, status, and trigger type.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter workflows updated after this RFC3339 timestamp'),
      limit: z
        .number()
        .optional()
        .describe('Page size, 1-250; requires API version 2026-03-15'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque next-page cursor; requires API version 2026-03-15 and unchanged filters'
        )
    })
  )
  .output(
    z.object({
      automations: z
        .array(
          z.object({
            automationId: z.string().describe('Automation ID'),
            name: z.string().optional().describe('Automation name'),
            status: z.string().optional().describe('Automation status'),
            triggerType: z.string().optional().describe('Trigger type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('List of automations'),
      nextCursor: z.string().optional().describe('Provider-issued next-page cursor'),
      previousCursor: z.string().optional().describe('Provider-issued previous-page cursor'),
      hasMore: z.boolean().optional().describe('Whether the provider reports another page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth, ctx.config.apiVersion);
    let output = await client.listAutomations({
      updatedAtFrom: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });
    return { output, message: 'Retrieved automations.' };
  })
  .build();
