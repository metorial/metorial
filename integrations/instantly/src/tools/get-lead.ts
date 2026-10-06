import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, leadVerificationStatus } from '../lib/client';
import { spec } from '../spec';

export let getLead = SlateTool.create(spec, {
  name: 'Get Lead',
  key: 'get_lead',
  description: `Retrieve full details of a specific lead including contact information, engagement metrics, custom variables, and campaign association.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leadId: z.string().describe('ID of the lead to retrieve.')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Lead ID'),
      email: z.string().optional().describe('Lead email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      companyName: z.string().optional().describe('Company name'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      companyDomain: z.string().optional().describe('Company domain'),
      campaignId: z.string().optional().describe('Associated campaign ID'),
      interestStatus: z.number().optional().describe('Interest status value'),
      emailOpenCount: z.number().optional().describe('Number of email opens'),
      emailReplyCount: z.number().optional().describe('Number of email replies'),
      emailClickCount: z.number().optional().describe('Number of link clicks'),
      personalization: z.string().optional().describe('Personalization text'),
      verificationStatus: z.string().optional().describe('Email verification status'),
      verificationStatusCode: z
        .number()
        .optional()
        .describe('Provider verification status code, when available.'),
      customVariables: z.any().optional().describe('Custom variables assigned to the lead'),
      timestampCreated: z.string().optional().describe('Creation timestamp'),
      timestampUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let l = await client.getLead(ctx.input.leadId);

    return {
      output: {
        leadId: l.id,
        email: l.email ?? undefined,
        firstName: l.first_name ?? undefined,
        lastName: l.last_name ?? undefined,
        companyName: l.company_name ?? undefined,
        phone: l.phone ?? undefined,
        website: l.website ?? undefined,
        companyDomain: l.company_domain,
        campaignId: l.campaign ?? undefined,
        interestStatus: l.lt_interest_status ?? undefined,
        emailOpenCount: l.email_open_count,
        emailReplyCount: l.email_reply_count,
        emailClickCount: l.email_click_count,
        personalization: l.personalization ?? undefined,
        verificationStatus: leadVerificationStatus(l.verification_status),
        verificationStatusCode:
          typeof l.verification_status === 'number' ? l.verification_status : undefined,
        customVariables: l.payload,
        timestampCreated: l.timestamp_created,
        timestampUpdated: l.timestamp_updated ?? undefined
      },
      message: `Retrieved lead **${l.email || l.first_name || l.id}**.`
    };
  })
  .build();
