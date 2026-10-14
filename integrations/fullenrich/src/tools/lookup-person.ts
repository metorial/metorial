import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapPerson, personSchema } from '../lib/profiles';
import { spec } from '../spec';

export let lookupPerson = SlateTool.create(spec, {
  name: 'Look Up Person',
  key: 'lookup_person',
  description:
    'Resolve a known person by their LinkedIn profile URL or numeric profile ID, or by full name and company. Returns at most one professional profile with employment and company details. To find email addresses or phone numbers, use Enrich Contacts.',
  instructions: [
    'Provide a person LinkedIn URL or ID, or a full name together with a company domain, LinkedIn URL, or ID.',
    'An empty people array means no match was found. Results may consume credits.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      personName: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Full name; combine with a company identifier'),
      personLinkedinUrl: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('LinkedIn profile URL of the person'),
      personLinkedinId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Numeric LinkedIn profile ID'),
      companyDomain: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Company domain to disambiguate a name match'),
      companyLinkedinUrl: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Company LinkedIn URL to disambiguate a name match'),
      companyLinkedinId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Numeric company LinkedIn ID to disambiguate a name match')
    })
  )
  .output(
    z.object({
      people: z
        .array(personSchema)
        .describe('Matching professional profile, or an empty array'),
      creditsUsed: z.number().optional().describe('Credits consumed by this lookup')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (
      !input.personLinkedinUrl &&
      !input.personLinkedinId &&
      !(
        input.personName &&
        (input.companyDomain || input.companyLinkedinUrl || input.companyLinkedinId)
      )
    ) {
      throw createApiServiceError(
        'Provide personLinkedinUrl or personLinkedinId, or personName together with a company identifier.'
      );
    }
    let result = await new Client({ token: ctx.auth.token }).lookupPerson({
      person_name: input.personName,
      person_professional_network_url: input.personLinkedinUrl,
      person_professional_network_id: input.personLinkedinId,
      company_domain: input.companyDomain,
      company_professional_network_url: input.companyLinkedinUrl,
      company_professional_network_id: input.companyLinkedinId
    });
    let people = (result.people ?? []).map(mapPerson);
    return {
      output: { people, creditsUsed: result.metadata?.credits },
      message: people.length
        ? 'Found the matching professional profile.'
        : 'No matching person was found.'
    };
  })
  .build();
