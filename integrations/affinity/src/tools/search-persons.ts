import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let personSchema = z.object({
  personId: z.number().describe('Unique identifier of the person'),
  firstName: z.string().nullable().describe('First name'),
  lastName: z.string().nullable().describe('Last name'),
  primaryEmail: z.string().nullable().describe('Primary email address'),
  emails: z.array(z.string()).describe('All email addresses'),
  organizationIds: z.array(z.number()).describe('IDs of associated organizations')
});

export let searchPersons = SlateTool.create(spec, {
  name: 'Search Persons',
  key: 'search_persons',
  description: `Search for person records in Affinity by name or email. Returns matching contacts with their email addresses and organization associations. Use this to find existing contacts before creating new ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      term: z
        .string()
        .optional()
        .describe('Search term to match against name or email address'),
      withInteractionDates: z
        .boolean()
        .optional()
        .describe('Include first and last interaction dates in results'),
      pageSize: z.number().optional().describe('Number of results per page (default 100)'),
      pageToken: z.string().optional().describe('Token for fetching the next page of results')
    })
  )
  .output(
    z.object({
      persons: z.array(personSchema).describe('List of matching persons'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.listPersons({
      term: ctx.input.term,
      withInteractionDates: ctx.input.withInteractionDates,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let persons = (result.persons ?? result ?? []).map((p: any) => ({
      personId: p.id,
      firstName: p.first_name ?? null,
      lastName: p.last_name ?? null,
      primaryEmail: p.primary_email ?? null,
      emails: p.emails ?? [],
      organizationIds: p.organization_ids ?? []
    }));

    return {
      output: {
        persons,
        nextPageToken: result.next_page_token ?? null
      },
      message: ctx.input.term
        ? `Found **${persons.length}** person(s) matching "${ctx.input.term}".`
        : `Retrieved **${persons.length}** person(s).`
    };
  })
  .build();
