import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addLeadToCampaign = SlateTool.create(spec, {
  name: 'Add Lead to Campaign',
  key: 'add_lead_to_campaign',
  description: `Add a new lead to a specific campaign. Supports setting lead details like name, email, company, job title, LinkedIn URL, and phone. Optionally enable deduplication, enrichment, email finding, and verification.`,
  instructions: [
    'The email field is typically required but can be omitted if findEmail enrichment is enabled.',
    'Custom variables can be passed as additional key-value pairs in customVariables.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('The ID of the campaign to add the lead to'),
      email: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('Lead first name'),
      lastName: z.string().optional().describe('Lead last name'),
      companyName: z.string().optional().describe('Lead company name'),
      jobTitle: z.string().optional().describe('Lead job title'),
      linkedinUrl: z.string().optional().describe('Lead LinkedIn profile URL'),
      phone: z.string().optional().describe('Lead phone number'),
      companyDomain: z.string().optional().describe('Lead company domain'),
      icebreaker: z.string().optional().describe('Personalized opening line for the lead'),
      picture: z.string().optional().describe('Lead profile picture URL'),
      deduplicate: z
        .boolean()
        .optional()
        .describe('Check if lead email exists in other campaigns before adding'),
      findEmail: z
        .boolean()
        .optional()
        .describe('Automatically find the lead email address (uses credits)'),
      verifyEmail: z
        .boolean()
        .optional()
        .describe('Verify the lead email address (uses credits)'),
      findPhone: z
        .boolean()
        .optional()
        .describe('Automatically find the lead phone number (uses credits)'),
      linkedinEnrichment: z
        .boolean()
        .optional()
        .describe('Enrich lead data from LinkedIn (uses credits)'),
      customVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional custom variables as key-value pairs')
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      campaignId: z.string().optional(),
      campaignName: z.string().optional(),
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyName: z.string().optional(),
      isPaused: z.boolean().optional(),
      contactId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let {
      campaignId,
      deduplicate,
      findEmail,
      verifyEmail,
      findPhone,
      linkedinEnrichment,
      customVariables,
      ...leadData
    } = ctx.input;

    let body: Record<string, unknown> = { ...leadData };
    if (customVariables) {
      Object.assign(body, customVariables);
    }

    let result = await client.addLeadToCampaign(campaignId, body, {
      deduplicate,
      findEmail,
      verifyEmail,
      findPhone,
      linkedinEnrichment
    });

    return {
      output: {
        leadId: result._id,
        campaignId: result.campaignId,
        campaignName: result.campaignName,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        companyName: result.companyName,
        isPaused: result.isPaused,
        contactId: result.contactId
      },
      message: `Added lead **${result.email || result.firstName || result._id}** to campaign "${result.campaignName || campaignId}".`
    };
  })
  .build();
