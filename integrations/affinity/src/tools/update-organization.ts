import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let updateOrganization = SlateTool.create(spec, {
  name: 'Update Organization',
  key: 'update_organization',
  description: `Update an existing organization record in Affinity. Provide only the fields you want to change. Global organizations (from the Affinity database) cannot be renamed.`,
  constraints: ['Global organizations cannot be renamed or deleted.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organizationId: z.number().describe('ID of the organization to update'),
      name: z.string().optional().describe('New name for the organization'),
      domain: z.string().optional().describe('New primary domain'),
      personIds: z
        .array(z.number())
        .optional()
        .describe('New list of person IDs (replaces existing)')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('ID of the updated organization'),
      name: z.string().nullable().describe('Organization name'),
      domain: z.string().nullable().describe('Primary domain'),
      domains: z.array(z.string()).describe('All associated domains'),
      global: z.boolean().describe('Whether this is a global organization'),
      personIds: z.array(z.number()).describe('Associated person IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let o = await client.updateOrganization(ctx.input.organizationId, {
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
      message: `Updated organization **${o.name}** (ID: ${o.id}).`
    };
  })
  .build();
