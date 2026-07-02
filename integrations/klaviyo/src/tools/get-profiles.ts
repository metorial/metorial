import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getProfiles = SlateTool.create(spec, {
  name: 'Get Profiles',
  key: 'get_profiles',
  description: `Search and retrieve customer profiles from Klaviyo. Supports filtering by email, phone number, external ID, and custom properties using Klaviyo's filter syntax.
Use pagination to iterate through large result sets.`,
  instructions: [
    'Filter syntax examples: `equals(email,"user@example.com")`, `contains(email,"@gmail.com")`, `greater-than(created,2024-01-01T00:00:00Z)`.',
    'Multiple filters can be combined with AND: `and(equals(email,"user@example.com"),greater-than(created,2024-01-01T00:00:00Z))`.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('Klaviyo filter string, e.g. equals(email,"user@example.com")'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, e.g. "created" or "-created" for descending'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)'),
      pageCursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            profileId: z.string().describe('Profile ID'),
            email: z.string().optional().describe('Email address'),
            phoneNumber: z.string().optional().describe('Phone number'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            organization: z.string().optional().describe('Organization'),
            title: z.string().optional().describe('Job title'),
            location: z.any().optional().describe('Location data'),
            properties: z.record(z.string(), z.any()).optional().describe('Custom properties'),
            created: z.string().optional().describe('Profile creation timestamp'),
            updated: z.string().optional().describe('Profile last updated timestamp')
          })
        )
        .describe('List of profiles'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getProfiles({
      filter: ctx.input.filter,
      sort: ctx.input.sort,
      pageSize: ctx.input.pageSize,
      pageCursor: ctx.input.pageCursor
    });

    let profiles = result.data.map(p => ({
      profileId: p.id ?? '',
      email: p.attributes?.email ?? undefined,
      phoneNumber: p.attributes?.phone_number ?? undefined,
      firstName: p.attributes?.first_name ?? undefined,
      lastName: p.attributes?.last_name ?? undefined,
      organization: p.attributes?.organization ?? undefined,
      title: p.attributes?.title ?? undefined,
      location: p.attributes?.location ?? undefined,
      properties: p.attributes?.properties ?? undefined,
      created: p.attributes?.created ?? undefined,
      updated: p.attributes?.updated ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: {
        profiles,
        nextCursor,
        hasMore: !!nextCursor
      },
      message: `Retrieved **${profiles.length}** profiles${nextCursor ? ' — more results available' : ''}`
    };
  })
  .build();
