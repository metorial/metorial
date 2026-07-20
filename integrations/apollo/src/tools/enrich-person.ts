import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import type { ApolloPerson } from '../lib/types';
import { spec } from '../spec';

export let mapBulkPersonMatches = (matches: Array<ApolloPerson | null>) =>
  matches
    .filter((person): person is ApolloPerson => person !== null)
    .map(person => ({
      personId: person.id,
      firstName: person.first_name,
      lastName: person.last_name,
      name: person.name,
      email: person.email,
      title: person.title,
      linkedinUrl: person.linkedin_url,
      organizationName: person.organization?.name
    }));

export let enrichPerson = SlateTool.create(spec, {
  name: 'Enrich Person',
  key: 'enrich_person',
  description: `Enrich a person's profile data using Apollo's enrichment engine. Provide identifiers like email, name + company, or LinkedIn URL to get detailed profile information including employment history, contact details, and organization data.
Supports both single and bulk enrichment (up to 10 records per request).`,
  instructions: [
    'Provide at least one identifier: email, name + domain/company, LinkedIn URL, or Apollo person ID.',
    'For bulk enrichment, use the records array. For single enrichment, use the top-level fields.',
    'Personal emails and phone numbers are not returned by default — set revealPersonalEmails or revealPhoneNumber to true if needed.'
  ],
  constraints: [
    'Enrichment consumes credits based on your Apollo pricing plan',
    'Bulk enrichment supports up to 10 records per request',
    'GDPR-compliant regions may restrict personal email access'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to look up'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      name: z.string().optional().describe('Full name (alternative to firstName + lastName)'),
      domain: z.string().optional().describe('Company domain, e.g. "apollo.io"'),
      organizationName: z.string().optional().describe('Company name'),
      linkedinUrl: z.string().optional().describe('LinkedIn profile URL'),
      apolloPersonId: z.string().optional().describe('Apollo person ID for direct lookup'),
      revealPersonalEmails: z
        .boolean()
        .optional()
        .describe('Set to true to include personal email addresses'),
      revealPhoneNumber: z
        .boolean()
        .optional()
        .describe('Set to true to include phone numbers'),
      records: z
        .array(
          z.object({
            email: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            name: z.string().optional(),
            domain: z.string().optional(),
            organizationName: z.string().optional(),
            linkedinUrl: z.string().optional(),
            apolloPersonId: z.string().optional()
          })
        )
        .optional()
        .describe('For bulk enrichment: array of up to 10 person records to enrich')
    })
  )
  .output(
    z.object({
      person: z
        .object({
          personId: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional(),
          emailStatus: z.string().optional(),
          title: z.string().optional(),
          headline: z.string().optional(),
          linkedinUrl: z.string().optional(),
          photoUrl: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          seniority: z.string().optional(),
          departments: z.array(z.string()).optional(),
          organizationName: z.string().optional(),
          organizationId: z.string().optional(),
          employmentHistory: z
            .array(
              z.object({
                organizationName: z.string().optional(),
                title: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
                current: z.boolean().optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Enriched person data (single enrichment)'),
      matches: z
        .array(
          z.object({
            personId: z.string().optional(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional(),
            title: z.string().optional(),
            linkedinUrl: z.string().optional(),
            organizationName: z.string().optional()
          })
        )
        .optional()
        .describe('Enriched records (bulk enrichment)'),
      creditsConsumed: z
        .number()
        .optional()
        .describe('Number of credits consumed by this enrichment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    if (ctx.input.records && ctx.input.records.length > 0) {
      if (ctx.input.records.length > 10) {
        throw apolloServiceError('Bulk person enrichment supports up to 10 records.');
      }

      for (let [index, record] of ctx.input.records.entries()) {
        let hasIdentifier =
          record.email ||
          record.name ||
          record.linkedinUrl ||
          record.apolloPersonId ||
          ((record.firstName || record.lastName) &&
            (record.domain || record.organizationName));

        if (!hasIdentifier) {
          throw apolloServiceError(
            `records[${index}] must include email, name, LinkedIn URL, Apollo person ID, or name plus company/domain.`
          );
        }
      }

      let result = await client.bulkEnrichPeople({
        details: ctx.input.records.map(r => ({
          email: r.email,
          first_name: r.firstName,
          last_name: r.lastName,
          name: r.name,
          domain: r.domain,
          organization_name: r.organizationName,
          linkedin_url: r.linkedinUrl,
          id: r.apolloPersonId
        })),
        revealPersonalEmails: ctx.input.revealPersonalEmails,
        revealPhoneNumber: ctx.input.revealPhoneNumber
      });

      let matches = mapBulkPersonMatches(result.matches);

      return {
        output: {
          matches,
          creditsConsumed: result.creditsConsumed
        },
        message: `Bulk enriched **${result.uniqueEnriched}** of ${result.totalRequested} requested records. Consumed **${result.creditsConsumed}** credits.`
      };
    }

    let hasIdentifier =
      ctx.input.email ||
      ctx.input.name ||
      ctx.input.linkedinUrl ||
      ctx.input.apolloPersonId ||
      ((ctx.input.firstName || ctx.input.lastName) &&
        (ctx.input.domain || ctx.input.organizationName));

    if (!hasIdentifier) {
      throw apolloServiceError(
        'Provide at least one identifier: email, name, LinkedIn URL, Apollo person ID, or name plus company/domain.'
      );
    }

    let result = await client.enrichPerson({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      name: ctx.input.name,
      domain: ctx.input.domain,
      organizationName: ctx.input.organizationName,
      linkedinUrl: ctx.input.linkedinUrl,
      apolloId: ctx.input.apolloPersonId,
      revealPersonalEmails: ctx.input.revealPersonalEmails,
      revealPhoneNumber: ctx.input.revealPhoneNumber
    });

    let p = result.person;
    if (!p) {
      return {
        output: {},
        message: 'No matching person found for the provided identifiers.'
      };
    }

    let person = {
      personId: p.id,
      firstName: p.first_name,
      lastName: p.last_name,
      name: p.name,
      email: p.email,
      emailStatus: p.email_status,
      title: p.title,
      headline: p.headline,
      linkedinUrl: p.linkedin_url,
      photoUrl: p.photo_url,
      city: p.city,
      state: p.state,
      country: p.country,
      seniority: p.seniority,
      departments: p.departments,
      organizationName: p.organization?.name,
      organizationId: p.organization_id,
      employmentHistory: p.employment_history?.map((eh: any) => ({
        organizationName: eh.organization_name,
        title: eh.title,
        startDate: eh.start_date,
        endDate: eh.end_date,
        current: eh.current
      }))
    };

    return {
      output: { person },
      message: `Enriched **${person.name || person.email}** — ${person.title || 'Unknown title'} at ${person.organizationName || 'Unknown company'}.`
    };
  })
  .build();
