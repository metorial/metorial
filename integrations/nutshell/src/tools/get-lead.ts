import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve a lead (sales opportunity) by ID from Nutshell CRM. Returns full lead details including status, value, associated contacts, accounts, products, stage, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to retrieve')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the lead'),
      rev: z.string().describe('Revision identifier'),
      name: z.string().optional().describe('Lead name/description'),
      status: z.string().optional().describe('Lead status (open, won, lost, canceled)'),
      value: z.any().optional().describe('Monetary value of the lead'),
      confidence: z.number().optional().describe('Win confidence percentage'),
      contacts: z.array(z.any()).optional().describe('Associated contacts'),
      accounts: z.array(z.any()).optional().describe('Associated accounts'),
      products: z.array(z.any()).optional().describe('Associated products'),
      competitors: z.array(z.any()).optional().describe('Associated competitors'),
      sources: z.array(z.any()).optional().describe('Lead sources'),
      milestone: z.any().optional().describe('Current stage/milestone'),
      assignee: z.any().optional().describe('Assigned user or team'),
      dueTime: z.string().optional().describe('Due date/time'),
      outcome: z.any().optional().describe('Lead outcome details'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      createdTime: z.string().optional().describe('Creation timestamp'),
      modifiedTime: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getLead(ctx.input.leadId);

    return {
      output: {
        leadId: result.id,
        rev: String(result.rev),
        name: result.name || result.description,
        status: result.status,
        value: result.value,
        confidence: result.confidence,
        contacts: result.contacts,
        accounts: result.accounts,
        products: result.products,
        competitors: result.competitors,
        sources: result.sources,
        milestone: result.milestone,
        assignee: result.assignee,
        dueTime: result.dueTime,
        outcome: result.outcome,
        customFields: result.customFields,
        createdTime: result.createdTime,
        modifiedTime: result.modifiedTime
      },
      message: `Retrieved lead **${result.name || result.description || result.id}** (ID: ${result.id}, status: ${result.status || 'unknown'}).`
    };
  })
  .build();
