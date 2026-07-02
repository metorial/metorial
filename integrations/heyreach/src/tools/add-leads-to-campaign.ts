import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let leadSchema = z.object({
  profileUrl: z.string().describe('LinkedIn profile URL of the lead (required)'),
  firstName: z.string().optional().describe('First name of the lead'),
  lastName: z.string().optional().describe('Last name of the lead'),
  location: z.string().optional().describe('Location of the lead'),
  companyName: z.string().optional().describe('Company name of the lead'),
  position: z.string().optional().describe('Job title/position of the lead'),
  emailAddress: z.string().optional().describe('Email address of the lead'),
  summary: z.string().optional().describe('Brief summary of the lead'),
  about: z.string().optional().describe('Additional information about the lead'),
  customUserFields: z
    .array(
      z.object({
        name: z
          .string()
          .describe(
            'Custom field name (must match the variable name in your HeyReach sequence)'
          ),
        value: z.string().describe('Custom field value')
      })
    )
    .optional()
    .describe('Custom personalization fields for sequences')
});

export let addLeadsToCampaign = SlateTool.create(spec, {
  name: 'Add Leads to Campaign',
  key: 'add_leads_to_campaign',
  description: `Add leads with personalization data to an existing HeyReach campaign. Leads are specified with their LinkedIn profile URL and optional fields like name, company, position, and custom variables for sequence personalization.`,
  instructions: [
    'The campaign must have been launched at least once before leads can be added via API.',
    'Custom field names must exactly match the variable names defined in your HeyReach sequences.',
    'Custom field names can only contain alphanumeric characters and underscores.'
  ],
  constraints: [
    'Maximum of 100 leads per request.',
    'Adding leads to a paused or finished campaign will automatically reactivate it.'
  ]
})
  .input(
    z.object({
      campaignId: z.number().describe('The ID of the campaign to add leads to'),
      leads: z.array(leadSchema).min(1).max(100).describe('Array of leads to add (1-100)'),
      linkedInAccountId: z
        .number()
        .optional()
        .describe(
          'LinkedIn sender account ID. If empty, leads are auto-assigned to any active sender.'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the add leads operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.addLeadsToCampaign(
      ctx.input.campaignId,
      ctx.input.leads,
      ctx.input.linkedInAccountId
    );

    return {
      output: { result: result?.data ?? result },
      message: `Added **${ctx.input.leads.length}** lead(s) to campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
