import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, leadOutput, warningOutput } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's information within a campaign. Can modify contact details. Can also mark the lead as interested or not interested, or pause/resume the lead.`,
  instructions: [
    'Provide the campaignId and leadId to identify the lead.',
    'Use the "action" field to mark interest or pause/resume within this campaign without changing data.',
    'Resuming can restart outreach. Company-name changes can rename a shared global company record or create and link one.',
    'Combined field changes and actions run sequentially; earlier writes may remain applied if a later action fails. Returned fields come from current provider readback, and warnings describe partial field acceptance.'
  ],
  tags: { readOnly: false, destructive: true }
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
      isPaused: z.boolean().optional(),
      warnings: z
        .array(z.object({ code: z.string().optional(), message: z.string().optional() }))
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token }),
      { campaignId, leadId, action, ...updateData } = ctx.input;
    await client.getLeadById(leadId, campaignId);
    const hasUpdates = Object.values(updateData).some(value => value !== undefined);
    const updated = hasUpdates
      ? await client.updateLead(campaignId, leadId, updateData)
      : undefined;
    if (action === 'interested') await client.markLeadInterested(leadId, campaignId);
    else if (action === 'not_interested')
      await client.markLeadNotInterested(leadId, campaignId);
    else if (action === 'pause' || action === 'resume') {
      const affected =
        action === 'pause'
          ? await client.pauseLead(leadId, campaignId)
          : await client.resumeLead(leadId, campaignId);
      if (
        !affected.some(item => item._id === leadId) ||
        affected.some(item => item.campaignId !== undefined && item.campaignId !== campaignId)
      )
        throw createApiServiceError(
          'Lemlist did not confirm the requested campaign-scoped lead action. Read the current enrollments before retrying.'
        );
    }
    const current = leadOutput(await client.getLeadById(leadId, campaignId));
    return {
      output: {
        leadId: current.leadId,
        email: current.email,
        firstName: current.firstName,
        lastName: current.lastName,
        companyName: current.companyName,
        isPaused: current.isPaused,
        warnings: warningOutput(updated?.warnings)
      },
      message: `Retrieved lead \`${leadId}\` after the requested campaign-scoped operations.`
    };
  })
  .build();
