import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid, validateVariables } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Add a new lead to a campaign or lead list. Supports custom variables for personalization. The lead can be optionally skipped if they already exist in the workspace or campaign.`,
  instructions: [
    'When adding to a campaign, the email field is required.',
    'When adding to a lead list, at least one of email, firstName, or lastName must be provided.'
  ]
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Lead email address. Required when adding to a campaign.'),
      firstName: z.string().optional().describe('Lead first name.'),
      lastName: z.string().optional().describe('Lead last name.'),
      companyName: z.string().optional().describe('Lead company name.'),
      website: z.string().optional().describe('Lead website URL.'),
      phone: z.string().optional().describe('Lead phone number.'),
      personalization: z.string().optional().describe('Custom personalization text.'),
      campaignId: z.string().optional().describe('Campaign ID to add the lead to.'),
      listId: z.string().optional().describe('Lead list ID to add the lead to.'),
      skipIfInWorkspace: z
        .boolean()
        .optional()
        .describe('Skip if the lead already exists in the workspace.'),
      skipIfInCampaign: z
        .boolean()
        .optional()
        .describe('Skip if the lead already exists in the campaign.'),
      customVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom variables for personalization. Values must be string, number, boolean, or null.'
        )
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('ID of the created lead'),
      email: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      timestampCreated: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.campaignId && !ctx.input.email) {
      throw invalid('An email address is required when adding a lead to a campaign.');
    }
    if (ctx.input.listId && !ctx.input.email && !ctx.input.firstName && !ctx.input.lastName) {
      throw invalid('Provide an email address, firstName, or lastName for the lead.');
    }
    validateVariables(ctx.input.customVariables);
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createLead({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      companyName: ctx.input.companyName,
      website: ctx.input.website,
      phone: ctx.input.phone,
      personalization: ctx.input.personalization,
      campaignId: ctx.input.campaignId,
      listId: ctx.input.listId,
      skipIfInWorkspace: ctx.input.skipIfInWorkspace,
      skipIfInCampaign: ctx.input.skipIfInCampaign,
      customVariables: ctx.input.customVariables
    });
    if (typeof result?.id !== 'string') {
      throw invalid('Lead creation did not return an identifier. Read back before retrying.');
    }

    return {
      output: {
        leadId: result.id,
        email: result.email ?? undefined,
        firstName: result.first_name ?? undefined,
        lastName: result.last_name ?? undefined,
        timestampCreated: result.timestamp_created
      },
      message: `Created lead **${result.email || result.first_name || result.id}**.`
    };
  })
  .build();
