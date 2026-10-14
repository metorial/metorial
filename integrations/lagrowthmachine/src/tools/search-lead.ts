import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchLead = SlateTool.create(spec, {
  name: 'Search Lead',
  key: 'search_lead',
  description: `Search for a lead in La Growth Machine by email, LinkedIn URL, lead ID, or name and company combination. Returns the full lead profile if found.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Professional or personal email address of the lead'),
      leadId: z.string().optional().describe('La Growth Machine internal lead ID'),
      crmId: z.string().optional().describe('Contact ID in the connected CRM'),
      linkedinUrl: z
        .string()
        .optional()
        .describe('LinkedIn profile URL (standard profiles only, not Sales Navigator URLs)'),
      firstname: z
        .string()
        .optional()
        .describe('First name of the lead (use with lastname and company fields)'),
      lastname: z
        .string()
        .optional()
        .describe('Last name of the lead (use with firstname and company fields)'),
      companyName: z
        .string()
        .optional()
        .describe('Company name (use with firstname and lastname)'),
      companyUrl: z
        .string()
        .optional()
        .describe('Company website URL (use with firstname and lastname)')
    })
  )
  .output(
    z.object({
      lead: z
        .any()
        .describe('The provider search response containing the lead and recent logs'),
      searchedLead: z
        .any()
        .optional()
        .describe('The matching lead record with all available profile fields'),
      recentLogs: z
        .array(z.any())
        .optional()
        .describe('Recent successful lead actions by campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.searchLead({
      email: ctx.input.email,
      leadId: ctx.input.leadId,
      crmId: ctx.input.crmId,
      linkedinUrl: ctx.input.linkedinUrl,
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      companyName: ctx.input.companyName,
      companyUrl: ctx.input.companyUrl
    });

    return {
      output: { lead: result, searchedLead: result?.lead, recentLogs: result?.recentLogs },
      message: 'Matching lead retrieved.'
    };
  })
  .build();
