import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's details, change its status, or mark it as sold. Use action "update" to modify lead fields, "change_status" to transition the lead to a new status, or "mark_sold" to record a sale with carrier, product line, premium, and policy details.`,
  instructions: [
    'For action "update": provide any combination of fields to update (firstName, lastName, email, phone, agentId, pipelineId, stageId, leadSourceId, tags, customFields).',
    'For action "change_status": provide the new status value.',
    'For action "mark_sold": provide sale details like carrier, productLine, premium, items, effectiveDate, and expiryDate.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead to update'),
      action: z
        .enum(['update', 'change_status', 'mark_sold'])
        .describe('Operation to perform: "update" fields, "change_status", or "mark_sold"'),
      firstName: z.string().optional().describe('Updated first name (for "update" action)'),
      lastName: z.string().optional().describe('Updated last name (for "update" action)'),
      email: z.string().optional().describe('Updated email address (for "update" action)'),
      phone: z.string().optional().describe('Updated phone number (for "update" action)'),
      agentId: z
        .string()
        .optional()
        .describe('Updated agent/producer ID (for "update" action)'),
      pipelineId: z.string().optional().describe('Updated pipeline ID (for "update" action)'),
      stageId: z
        .string()
        .optional()
        .describe('Updated pipeline stage ID (for "update" action)'),
      leadSourceId: z
        .string()
        .optional()
        .describe('Updated lead source ID (for "update" action)'),
      tags: z.array(z.string()).optional().describe('Updated tags (for "update" action)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom fields (for "update" action)'),
      status: z
        .enum(['new', 'contacted', 'quoted', 'won', 'lost', 'x-dated'])
        .optional()
        .describe('New status for the lead (for "change_status" action)'),
      carrier: z.string().optional().describe('Carrier name (for "mark_sold" action)'),
      productLine: z.string().optional().describe('Product line (for "mark_sold" action)'),
      premium: z
        .number()
        .optional()
        .describe('Premium amount in dollars (for "mark_sold" action)'),
      items: z.number().optional().describe('Number of policy items (for "mark_sold" action)'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Policy effective date in ISO 8601 format (for "mark_sold" action)'),
      expiryDate: z
        .string()
        .optional()
        .describe('Policy expiry date in ISO 8601 format (for "mark_sold" action)')
    })
  )
  .output(
    z.object({
      lead: z
        .record(z.string(), z.any())
        .describe('The updated lead data returned by AgencyZoom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result: any;

    switch (ctx.input.action) {
      case 'update': {
        let data: Record<string, unknown> = {};
        if (ctx.input.firstName !== undefined) data.firstName = ctx.input.firstName;
        if (ctx.input.lastName !== undefined) data.lastName = ctx.input.lastName;
        if (ctx.input.email !== undefined) data.email = ctx.input.email;
        if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
        if (ctx.input.agentId !== undefined) data.agentId = ctx.input.agentId;
        if (ctx.input.pipelineId !== undefined) data.pipelineId = ctx.input.pipelineId;
        if (ctx.input.stageId !== undefined) data.stageId = ctx.input.stageId;
        if (ctx.input.leadSourceId !== undefined) data.leadSourceId = ctx.input.leadSourceId;
        if (ctx.input.tags !== undefined) data.tags = ctx.input.tags;
        if (ctx.input.customFields !== undefined) data.customFields = ctx.input.customFields;

        result = await client.updateLead(ctx.input.leadId, data);
        let leadData = result.data ?? result;

        return {
          output: { lead: leadData },
          message: `Updated lead **${ctx.input.leadId}** fields.`
        };
      }
      case 'change_status': {
        if (!ctx.input.status) {
          throw new Error('status is required for "change_status" action');
        }

        result = await client.changeLeadStatus(ctx.input.leadId, { status: ctx.input.status });
        let leadData = result.data ?? result;

        return {
          output: { lead: leadData },
          message: `Changed lead **${ctx.input.leadId}** status to **${ctx.input.status}**.`
        };
      }
      case 'mark_sold': {
        let data: Record<string, unknown> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;
        if (ctx.input.effectiveDate !== undefined)
          data.effectiveDate = ctx.input.effectiveDate;
        if (ctx.input.expiryDate !== undefined) data.expiryDate = ctx.input.expiryDate;

        result = await client.markLeadSold(ctx.input.leadId, data);
        let leadData = result.data ?? result;

        return {
          output: { lead: leadData },
          message: `Marked lead **${ctx.input.leadId}** as sold.${ctx.input.carrier ? ` Carrier: **${ctx.input.carrier}**.` : ''}${ctx.input.premium ? ` Premium: **$${ctx.input.premium}**.` : ''}`
        };
      }
    }
  })
  .build();
