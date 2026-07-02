import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let searchParties = SlateTool.create(spec, {
  name: 'Search Parties',
  key: 'search_parties',
  description: `Search for contacts in Capsule CRM by name, postcode, phone number, or other text. Returns matching people and organisations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search term (name, postcode, phone number)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page, 1-100 (default: 50)'),
      embed: z
        .array(z.enum(['tags', 'fields', 'organisation', 'missingImportantFields']))
        .optional()
        .describe('Additional data to embed')
    })
  )
  .output(
    z.object({
      parties: z
        .array(
          z.object({
            partyId: z.number().describe('Unique identifier'),
            type: z.string().describe('"person" or "organisation"'),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            name: z.string().optional(),
            jobTitle: z.string().optional(),
            emailAddresses: z.array(z.any()).optional(),
            phoneNumbers: z.array(z.any()).optional()
          })
        )
        .describe('Matching parties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });

    let result = await client.searchParties(ctx.input.query, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      embed: ctx.input.embed
    });

    let parties = (result.parties || []).map((p: any) => ({
      partyId: p.id,
      type: p.type,
      firstName: p.firstName,
      lastName: p.lastName,
      name: p.name,
      jobTitle: p.jobTitle,
      emailAddresses: p.emailAddresses,
      phoneNumbers: p.phoneNumbers
    }));

    return {
      output: { parties },
      message: `Found **${parties.length}** parties matching "${ctx.input.query}".`
    };
  })
  .build();
