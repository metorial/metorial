import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichContacts = SlateTool.create(spec, {
  name: 'Enrich Contacts',
  key: 'enrich_contacts',
  description: `Retrieve full ZoomInfo profiles for up to 25 contacts per request. Returns detailed sales intelligence including direct dials, email addresses, job titles, and company firmographics. You can match by contact ID (from search results), email, or name + company combination.`,
  instructions: [
    'Best practice: first use Search Contacts to find IDs, then enrich by ID for accurate matching.',
    'If you cannot do a two-step search+enrich, provide as much identifying information as possible (name + company + title) for better match accuracy.',
    'Customize outputFields to receive only the data you need.'
  ],
  constraints: [
    'Each new record enrichment consumes 1 credit. Re-enriching the same record within 12 months is free.',
    'Maximum 25 contacts per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      matchBy: z
        .enum(['personId', 'email', 'nameAndCompany'])
        .describe(
          'How to match contacts: by ZoomInfo person ID, email address, or name+company combination'
        ),
      personIds: z
        .array(z.string())
        .optional()
        .describe('ZoomInfo person IDs (when matchBy is "personId")'),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses to look up (when matchBy is "email")'),
      contacts: z
        .array(
          z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            companyName: z.string().optional(),
            companyId: z.number().optional(),
            jobTitle: z.string().optional(),
            emailAddress: z.string().optional()
          })
        )
        .optional()
        .describe('Contact records to match (when matchBy is "nameAndCompany")'),
      outputFields: z
        .array(z.string())
        .optional()
        .describe(
          'Specific fields to return (e.g., ["firstName", "lastName", "email", "directPhoneNumber", "jobTitle", "companyName"])'
        )
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.any()))
        .describe('Enriched contact records with full profile data'),
      matchCount: z.number().describe('Number of successfully matched contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {};

    if (ctx.input.matchBy === 'personId' && ctx.input.personIds) {
      params.personId = ctx.input.personIds;
    } else if (ctx.input.matchBy === 'email' && ctx.input.emailAddresses) {
      params.emailAddress = ctx.input.emailAddresses;
    } else if (ctx.input.matchBy === 'nameAndCompany' && ctx.input.contacts) {
      params.matchPersonInput = ctx.input.contacts;
    }

    let result = await client.enrichContacts(params, ctx.input.outputFields);

    let contacts = result.data || result.result || [];

    return {
      output: {
        contacts,
        matchCount: contacts.length
      },
      message: `Enriched **${contacts.length}** contact(s) successfully.`
    };
  })
  .build();
