import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's information within a campaign. Can modify contact details. Can also mark the lead as interested or not interested, or pause/resume the lead.`,
  instructions: [
    'Provide the campaignId and leadId to identify the lead.',
    'Use the "action" field to mark interest or pause/resume without changing data.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign the lead belongs to'),
      leadId: z.string().describe('The ID of the lead to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      companyName: z.string().optional().describe('Updated company name'),
      jobTitle: z.string().optional().describe('Updated job title'),
      action: z
        .enum(['interested', 'not_interested', 'pause', 'resume'])
        .optional()
        .describe('Action to perform on the lead')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      isPaused: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { campaignId, leadId, action, ...updateData } = ctx.input;

    let hasUpdates = Object.values(updateData).some(v => v !== undefined);
    let result: any;

    if (hasUpdates) {
      result = await client.updateLead(campaignId, leadId, updateData);
    }

    if (action === 'interested') {
      await client.markLeadInterested(leadId, campaignId);
    } else if (action === 'not_interested') {
      await client.markLeadNotInterested(leadId, campaignId);
    } else if (action === 'pause') {
      await client.pauseLead(leadId, campaignId);
    } else if (action === 'resume') {
      await client.resumeLead(leadId, campaignId);
    }

    if (!result) {
      result = {};
    }

    let actions: string[] = [];
    if (hasUpdates) actions.push('updated');
    if (action)
      actions.push(
        action === 'not_interested'
          ? 'marked as not interested'
          : action === 'interested'
            ? 'marked as interested'
            : action === 'pause'
              ? 'paused'
              : 'resumed'
      );

    return {
      output: {
        leadId,
        email: result.email,
        firstName: result.firstName ?? updateData.firstName,
        lastName: result.lastName ?? updateData.lastName,
        companyName: result.companyName ?? updateData.companyName,
        isPaused: result.isPaused
      },
      message: `Lead \`${leadId}\` ${actions.join(' and ') || 'processed'}.`
    };
  })
  .build();
