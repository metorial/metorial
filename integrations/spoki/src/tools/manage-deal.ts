import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDeal = SlateTool.create(spec, {
  name: 'Manage Deal',
  key: 'manage_deal',
  description: `Creates or updates a deal (sales opportunity) in Spoki. Deals track progress through customizable pipelines and can be associated with contacts.
Provide a dealId to update an existing deal, or omit it to create a new one.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().optional().describe('Deal ID to update. Omit to create a new deal.'),
      name: z.string().optional().describe('Name/title of the deal (required when creating)'),
      contactId: z.string().optional().describe('ID of the associated contact'),
      phone: z.string().optional().describe('Phone of the associated contact (E.164 format)'),
      value: z.number().optional().describe('Monetary value of the deal'),
      pipelineId: z.string().optional().describe('Pipeline ID to place the deal in'),
      stageId: z.string().optional().describe('Stage ID within the pipeline'),
      ownerId: z.string().optional().describe('User ID of the deal owner/assignee'),
      expectedCloseDate: z
        .string()
        .optional()
        .describe('Expected close date (ISO 8601 format, e.g., "2025-06-30")'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      dealId: z.string().optional().describe('ID of the created or updated deal'),
      name: z.string().optional().describe('Deal name'),
      value: z.number().optional().describe('Deal value'),
      stageId: z.string().optional().describe('Current stage ID'),
      raw: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.dealId) {
      ctx.info(`Updating deal ${ctx.input.dealId}`);
      result = await client.updateDeal(ctx.input.dealId, {
        name: ctx.input.name,
        value: ctx.input.value,
        stageId: ctx.input.stageId,
        ownerId: ctx.input.ownerId,
        expectedCloseDate: ctx.input.expectedCloseDate,
        customFields: ctx.input.customFields
      });
    } else {
      if (!ctx.input.name) {
        throw new Error('Deal name is required when creating a new deal.');
      }
      ctx.info(`Creating deal "${ctx.input.name}"`);
      result = await client.createDeal({
        name: ctx.input.name,
        contactId: ctx.input.contactId,
        phone: ctx.input.phone,
        value: ctx.input.value,
        pipelineId: ctx.input.pipelineId,
        stageId: ctx.input.stageId,
        ownerId: ctx.input.ownerId,
        expectedCloseDate: ctx.input.expectedCloseDate,
        customFields: ctx.input.customFields
      });
    }

    let dealId = result?.id
      ? String(result.id)
      : result?.deal_id
        ? String(result.deal_id)
        : ctx.input.dealId;

    return {
      output: {
        dealId,
        name: result?.name || ctx.input.name,
        value: result?.value ?? ctx.input.value,
        stageId:
          result?.stage_id || result?.stage
            ? String(result.stage_id || result.stage)
            : ctx.input.stageId,
        raw: result
      },
      message: ctx.input.dealId
        ? `Updated deal **${ctx.input.dealId}**`
        : `Created deal **${ctx.input.name}**`
    };
  })
  .build();
