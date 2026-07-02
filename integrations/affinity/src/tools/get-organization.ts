import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let getOrganization = SlateTool.create(spec, {
  name: 'Get Organization',
  key: 'get_organization',
  description: `Retrieve a single organization record by ID, including its domains, person associations, and list memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.number().describe('ID of the organization to retrieve'),
      withInteractionDates: z
        .boolean()
        .optional()
        .describe('Include first and last interaction dates')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Unique identifier'),
      name: z.string().nullable().describe('Organization name'),
      domain: z.string().nullable().describe('Primary domain'),
      domains: z.array(z.string()).describe('All associated domains'),
      global: z.boolean().describe('Whether this is a global organization'),
      personIds: z.array(z.number()).describe('IDs of associated persons'),
      listEntries: z
        .array(
          z.object({
            listEntryId: z.number().describe('List entry ID'),
            listId: z.number().describe('List ID'),
            creatorId: z.number().nullable().describe('ID of the user who added this entry'),
            createdAt: z.string().nullable().describe('When the entry was created')
          })
        )
        .optional()
        .describe('List entries this organization belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.getOrganization(ctx.input.organizationId, {
      withInteractionDates: ctx.input.withInteractionDates
    });

    let listEntries = (o.list_entries ?? []).map((e: any) => ({
      listEntryId: e.id,
      listId: e.list_id,
      creatorId: e.creator_id ?? null,
      createdAt: e.created_at ?? null
    }));

    return {
      output: {
        organizationId: o.id,
        name: o.name ?? null,
        domain: o.domain ?? null,
        domains: o.domains ?? [],
        global: o.global ?? false,
        personIds: o.person_ids ?? [],
        listEntries
      },
      message: `Retrieved organization **${o.name}** (ID: ${o.id}).`
    };
  })
  .build();
