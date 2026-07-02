import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let createOrganization = SlateTool.create(spec, {
  name: 'Create Organization',
  key: 'create_organization',
  description: `Create a new organization record in Affinity. Provide a name and optionally a domain and person associations. If an organization with the same domain already exists in the global database, it may be linked automatically.`,
  instructions: ['Search for existing organizations before creating to avoid duplicates.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the organization'),
      domain: z
        .string()
        .optional()
        .describe('Primary domain of the organization (e.g. "example.com")'),
      personIds: z
        .array(z.number())
        .optional()
        .describe('IDs of persons to associate with this organization')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('ID of the created organization'),
      name: z.string().nullable().describe('Organization name'),
      domain: z.string().nullable().describe('Primary domain'),
      domains: z.array(z.string()).describe('All associated domains'),
      global: z.boolean().describe('Whether this is a global organization'),
      personIds: z.array(z.number()).describe('Associated person IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.createOrganization({
      name: ctx.input.name,
      domain: ctx.input.domain,
      person_ids: ctx.input.personIds
    });

    return {
      output: {
        organizationId: o.id,
        name: o.name ?? null,
        domain: o.domain ?? null,
        domains: o.domains ?? [],
        global: o.global ?? false,
        personIds: o.person_ids ?? []
      },
      message: `Created organization **${o.name}** (ID: ${o.id}).`
    };
  })
  .build();
