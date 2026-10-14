import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description:
    'Inspect organizations accessible to the current API key, including organization IDs, names, and subscription plans.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          orgId: z.string().describe('Organization ID'),
          name: z.string().optional().describe('Organization name'),
          plan: z.string().optional().describe('Subscription plan'),
          type: z.string().optional().describe('Organization type'),
          owner: z.string().optional().describe('Owner ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      ),
      count: z.number().describe('Number of organizations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({ token: ctx.auth.token, region: ctx.config.region });
    let organizations = (await client.listOrganizations()).map(org => ({
      orgId: org._id,
      name: org.name ?? undefined,
      plan: org.plan ?? undefined,
      type: org.type ?? undefined,
      owner: org.owner ?? undefined,
      createdAt: org.created_at ?? undefined
    }));
    return {
      output: { organizations, count: organizations.length },
      message: `Found ${organizations.length} organization(s).`
    };
  })
  .build();
