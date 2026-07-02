import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update a lead's information, custom variables, or interest status. Can update contact details and also change the lead's interest status for a specific campaign.`,
  instructions: [
    'To update interest status, provide the leadEmail and interestValue fields. Interest value can be set to null to reset.',
    'To update contact details, provide the leadId and the fields to change.'
  ]
})
  .input(
    z.object({
      leadId: z
        .string()
        .optional()
        .describe('ID of the lead to update (for contact detail updates).'),
      firstName: z.string().optional().describe('Updated first name.'),
      lastName: z.string().optional().describe('Updated last name.'),
      companyName: z.string().optional().describe('Updated company name.'),
      website: z.string().optional().describe('Updated website URL.'),
      phone: z.string().optional().describe('Updated phone number.'),
      personalization: z.string().optional().describe('Updated personalization text.'),
      customVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom variables to set or update.'),
      leadEmail: z
        .string()
        .optional()
        .describe('Lead email address (for interest status update).'),
      interestValue: z
        .number()
        .nullable()
        .optional()
        .describe('New interest status value, or null to reset.'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID to scope the interest status update.'),
      listId: z
        .string()
        .optional()
        .describe('Lead list ID to scope the interest status update.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      leadId: z.string().optional().describe('ID of the updated lead')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.leadId) {
      let updatePayload: Record<string, any> = {};
      if (ctx.input.firstName !== undefined) updatePayload.first_name = ctx.input.firstName;
      if (ctx.input.lastName !== undefined) updatePayload.last_name = ctx.input.lastName;
      if (ctx.input.companyName !== undefined)
        updatePayload.company_name = ctx.input.companyName;
      if (ctx.input.website !== undefined) updatePayload.website = ctx.input.website;
      if (ctx.input.phone !== undefined) updatePayload.phone = ctx.input.phone;
      if (ctx.input.personalization !== undefined)
        updatePayload.personalization = ctx.input.personalization;
      if (ctx.input.customVariables !== undefined)
        updatePayload.custom_variables = ctx.input.customVariables;

      if (Object.keys(updatePayload).length > 0) {
        await client.updateLead(ctx.input.leadId, updatePayload);
      }
    }

    if (ctx.input.leadEmail && ctx.input.interestValue !== undefined) {
      await client.updateLeadInterestStatus({
        leadEmail: ctx.input.leadEmail,
        interestValue: ctx.input.interestValue,
        campaignId: ctx.input.campaignId,
        listId: ctx.input.listId
      });
    }

    return {
      output: {
        success: true,
        leadId: ctx.input.leadId
      },
      message: `Updated lead${ctx.input.leadId ? ` ${ctx.input.leadId}` : ''}${ctx.input.leadEmail ? ` interest status for ${ctx.input.leadEmail}` : ''}.`
    };
  })
  .build();
