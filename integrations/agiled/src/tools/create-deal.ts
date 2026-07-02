import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal in the Agiled CRM pipeline. Track deals with a name, value, stage, and associated contact for sales management.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Deal name'),
      value: z.number().optional().describe('Deal monetary value'),
      contactId: z.string().optional().describe('ID of the associated contact'),
      stageId: z.string().optional().describe('Pipeline stage ID'),
      closeDate: z.string().optional().describe('Expected close date (YYYY-MM-DD)'),
      agentId: z.string().optional().describe('Sales agent user ID'),
      sourceId: z.string().optional().describe('CRM source ID (how the lead was acquired)'),
      statusId: z.string().optional().describe('CRM status ID'),
      notes: z.string().optional().describe('Notes about the deal')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the created deal'),
      name: z.string().describe('Deal name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createDeal({
      name: ctx.input.name,
      value: ctx.input.value,
      contact_id: ctx.input.contactId,
      pipeline_stage_id: ctx.input.stageId,
      close_date: ctx.input.closeDate,
      agent_id: ctx.input.agentId,
      lead_source_id: ctx.input.sourceId,
      status_id: ctx.input.statusId,
      note: ctx.input.notes
    });

    let deal = result.data;

    return {
      output: {
        dealId: String(deal.id ?? ''),
        name: String(deal.name ?? ctx.input.name)
      },
      message: `Created deal **${ctx.input.name}**${ctx.input.value ? ` ($${ctx.input.value})` : ''}.`
    };
  })
  .build();
