import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead's properties including title, description, status, pipeline step, amount, probability, tags, reminder, estimated closing date, and client folder association. Also supports assigning or reassigning the lead to a different user.`,
  instructions: [
    'To change the lead status, set the status field to one of: todo, standby, won, lost, cancelled.',
    'To move a lead to a different pipeline step, provide the step name.',
    'To assign or reassign a lead, provide the assignToUserId field.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.number().describe('ID of the lead to update'),
      title: z.string().optional().describe('New title for the lead'),
      description: z.string().optional().describe('New description for the lead'),
      status: z
        .enum(['todo', 'standby', 'won', 'lost', 'cancelled'])
        .optional()
        .describe('New status for the lead'),
      step: z.string().optional().describe('Pipeline step name to move the lead to'),
      amount: z.number().optional().describe('Deal amount'),
      probability: z.number().optional().describe('Win probability percentage (0-100)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to set on the lead (replaces existing tags)'),
      remindDate: z.string().optional().describe('Reminder date (YYYY-MM-DD)'),
      remindTime: z.string().optional().describe('Reminder time (HH:MM)'),
      estimatedClosingDate: z
        .string()
        .optional()
        .describe('Estimated closing date (YYYY-MM-DD)'),
      clientFolderId: z.number().optional().describe('Client folder ID to associate with'),
      assignToUserId: z.number().optional().describe('User ID to assign/reassign the lead to')
    })
  )
  .output(
    z.object({
      leadId: z.number().describe('ID of the updated lead'),
      title: z.string().describe('Updated title'),
      status: z.string().describe('Updated status'),
      step: z.string().optional().describe('Updated pipeline step'),
      amount: z.number().optional().describe('Updated amount'),
      userId: z.number().optional().describe('Assigned user ID'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let lead = await client.updateLead(ctx.input.leadId, {
      title: ctx.input.title,
      description: ctx.input.description,
      status: ctx.input.status,
      step: ctx.input.step,
      amount: ctx.input.amount,
      probability: ctx.input.probability,
      tags: ctx.input.tags,
      remindDate: ctx.input.remindDate,
      remindTime: ctx.input.remindTime,
      estimatedClosingDate: ctx.input.estimatedClosingDate,
      clientFolderId: ctx.input.clientFolderId
    });

    if (ctx.input.assignToUserId) {
      lead = await client.assignLead(ctx.input.leadId, ctx.input.assignToUserId);
    }

    return {
      output: {
        leadId: lead.id,
        title: lead.title,
        status: lead.status,
        step: lead.step,
        amount: lead.amount,
        userId: lead.user_id,
        updatedAt: lead.updated_at
      },
      message: `Updated lead **"${lead.title}"** (ID: ${lead.id}) — status: ${lead.status}${lead.step ? `, step: ${lead.step}` : ''}.`
    };
  })
  .build();
