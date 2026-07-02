import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead (sales opportunity) in Nutshell CRM. Leads can be associated with contacts, accounts, products, sources, and competitors. Supports setting value, confidence, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      description: z.string().optional().describe('Description of the lead/opportunity'),
      contactIds: z
        .array(z.number())
        .optional()
        .describe('IDs of contacts to associate with this lead'),
      accountIds: z
        .array(z.number())
        .optional()
        .describe('IDs of accounts to associate with this lead'),
      note: z.string().optional().describe('Initial note to add to the lead'),
      value: z
        .object({
          amount: z.number().describe('Monetary value of the lead'),
          currency: z.string().optional().describe('Currency code (e.g., "USD")')
        })
        .optional()
        .describe('Estimated value of the lead'),
      confidence: z
        .number()
        .optional()
        .describe('Confidence percentage (0-100) of winning the lead'),
      assigneeId: z.number().optional().describe('User ID to assign the lead to'),
      dueTime: z.string().optional().describe('Due date/time for the lead (ISO 8601 format)'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the created lead'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().optional().describe('Name/description of the lead'),
      entityType: z.string().describe('Entity type (Leads)'),
      status: z.string().optional().describe('Current status of the lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let leadData: Record<string, any> = {};

    if (ctx.input.description) leadData.description = ctx.input.description;
    if (ctx.input.contactIds) {
      leadData.contacts = ctx.input.contactIds.map(id => ({ entityType: 'Contacts', id }));
    }
    if (ctx.input.accountIds) {
      leadData.accounts = ctx.input.accountIds.map(id => ({ entityType: 'Accounts', id }));
    }
    if (ctx.input.note) leadData.note = ctx.input.note;
    if (ctx.input.value) leadData.value = ctx.input.value;
    if (ctx.input.confidence !== undefined) leadData.confidence = ctx.input.confidence;
    if (ctx.input.assigneeId)
      leadData.assignee = { entityType: 'Users', id: ctx.input.assigneeId };
    if (ctx.input.dueTime) leadData.dueTime = ctx.input.dueTime;
    if (ctx.input.customFields) leadData.customFields = ctx.input.customFields;

    let result = await client.newLead(leadData);

    return {
      output: {
        leadId: result.id,
        rev: String(result.rev),
        name: result.name || result.description,
        entityType: result.entityType,
        status: result.status
      },
      message: `Created lead **${result.name || result.description || result.id}** (ID: ${result.id}).`
    };
  })
  .build();
