import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead in Nutshell CRM. Supports changing status, value, confidence, stage, assignee, contacts, accounts, and custom fields. Can be used to move leads between stages or mark outcomes.`,
  instructions: [
    'To move a lead to a new stage, provide the milestoneId field.',
    'To mark a lead as won or lost, update the status field accordingly.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to update'),
      rev: z
        .string()
        .optional()
        .describe(
          'Revision identifier. If not provided, fetched automatically. Use "REV_IGNORE" to bypass.'
        ),
      description: z.string().optional().describe('Updated description'),
      status: z
        .number()
        .optional()
        .describe('Updated status (0=canceled, 1=open, 2=won, 3=lost)'),
      value: z
        .object({
          amount: z.number().describe('Monetary value'),
          currency: z.string().optional().describe('Currency code')
        })
        .optional()
        .describe('Updated value'),
      confidence: z.number().optional().describe('Updated confidence percentage (0-100)'),
      assigneeId: z.number().optional().describe('User ID to assign the lead to'),
      milestoneId: z.number().optional().describe('Stage/milestone ID to move the lead to'),
      contactIds: z
        .array(z.number())
        .optional()
        .describe('Contact IDs to associate (replaces existing)'),
      accountIds: z
        .array(z.number())
        .optional()
        .describe('Account IDs to associate (replaces existing)'),
      dueTime: z.string().optional().describe('Updated due date/time (ISO 8601 format)'),
      note: z.string().optional().describe('Note to add to the lead'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to set. Set a value to null to remove it.')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the updated lead'),
      rev: z.string().describe('New revision identifier'),
      name: z.string().optional().describe('Name of the updated lead'),
      status: z.string().optional().describe('Current status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let rev = ctx.input.rev;
    if (!rev) {
      let existing = await client.getLead(ctx.input.leadId);
      rev = String(existing.rev);
    }

    let leadData: Record<string, any> = {};
    if (ctx.input.description !== undefined) leadData.description = ctx.input.description;
    if (ctx.input.status !== undefined) leadData.status = ctx.input.status;
    if (ctx.input.value !== undefined) leadData.value = ctx.input.value;
    if (ctx.input.confidence !== undefined) leadData.confidence = ctx.input.confidence;
    if (ctx.input.assigneeId !== undefined)
      leadData.assignee = { entityType: 'Users', id: ctx.input.assigneeId };
    if (ctx.input.milestoneId !== undefined)
      leadData.milestone = { entityType: 'Milestones', id: ctx.input.milestoneId };
    if (ctx.input.contactIds !== undefined) {
      leadData.contacts = ctx.input.contactIds.map(id => ({ entityType: 'Contacts', id }));
    }
    if (ctx.input.accountIds !== undefined) {
      leadData.accounts = ctx.input.accountIds.map(id => ({ entityType: 'Accounts', id }));
    }
    if (ctx.input.dueTime !== undefined) leadData.dueTime = ctx.input.dueTime;
    if (ctx.input.note !== undefined) leadData.note = ctx.input.note;
    if (ctx.input.customFields !== undefined) leadData.customFields = ctx.input.customFields;

    let result = await client.editLead(ctx.input.leadId, rev, leadData);

    return {
      output: {
        leadId: result.id,
        rev: String(result.rev),
        name: result.name || result.description,
        status: result.status
      },
      message: `Updated lead **${result.name || result.description || result.id}** (ID: ${result.id}).`
    };
  })
  .build();
