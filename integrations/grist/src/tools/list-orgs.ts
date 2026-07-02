import { SlateTool } from 'slates';
import { z } from 'zod';
import { GristClient } from '../lib/client';
import { spec } from '../spec';

let orgSchema = z.object({
  orgId: z.number().describe('Organization ID'),
  name: z.string().describe('Organization name'),
  domain: z.string().nullable().describe('Organization domain/subdomain'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listOrgs = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_orgs',
  description: `List all accessible organizations (team sites and personal spaces). Returns org IDs, names, and domains that the authenticated user can access.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(orgSchema).describe('List of accessible organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GristClient({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let orgs = await client.listOrgs();

    let organizations = orgs.map((org: any) => ({
      orgId: org.id,
      name: org.name,
      domain: org.domain ?? null,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt
    }));

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
