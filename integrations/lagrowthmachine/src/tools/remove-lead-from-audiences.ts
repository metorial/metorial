import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeLeadFromAudiences = SlateTool.create(spec, {
  name: 'Remove Lead from Audiences',
  key: 'remove_lead_from_audiences',
  description: `Remove a lead from one or more La Growth Machine audiences. Provide the audience name(s) or use "all" to remove from all audiences. Identify the lead by email, LinkedIn URL, lead ID, or name + company.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      audience: z
        .union([z.string(), z.array(z.string())])
        .describe(
          'Audience name(s) to remove the lead from, or "all" to remove from all audiences'
        ),
      email: z.string().optional().describe('Email address of the lead'),
      leadId: z.string().optional().describe('La Growth Machine lead ID'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      twitter: z.string().optional().describe('Twitter/X handle'),
      crmId: z.string().optional().describe('CRM identifier'),
      firstname: z
        .string()
        .optional()
        .describe('First name (use with lastname and company fields)'),
      lastname: z
        .string()
        .optional()
        .describe('Last name (use with firstname and company fields)'),
      companyName: z.string().optional().describe('Company name'),
      companyUrl: z.string().optional().describe('Company website URL')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Confirmation of the removal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.removeLeadFromAudiences({
      audience: ctx.input.audience,
      email: ctx.input.email,
      leadId: ctx.input.leadId,
      linkedinUrl: ctx.input.linkedinUrl,
      twitter: ctx.input.twitter,
      crmId: ctx.input.crmId,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl
    });

    let audienceDisplay = Array.isArray(ctx.input.audience)
      ? ctx.input.audience.join(', ')
      : ctx.input.audience;

    return {
      output: { result },
      message: `Lead removed from audience(s): **${audienceDisplay}**.`
    };
  })
  .build();
