import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all Supabase organizations accessible to the authenticated user. Returns organization details including name, slug, and billing plan.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string().describe('Organization ID'),
          name: z.string().describe('Organization name'),
          slug: z.string().describe('Organization slug'),
          billingEmail: z.string().optional().describe('Billing email address')
        })
      ),
      totalCount: z.number().describe('Number of organizations returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient(ctx.auth.token);
    let data = await client.listOrganizations();

    let organizations = (Array.isArray(data) ? data : []).map((o: any) => ({
      organizationId: o.id ?? '',
      name: o.name ?? '',
      slug: o.slug ?? '',
      billingEmail: o.billing_email ?? undefined
    }));

    return {
      output: { organizations, totalCount: organizations.length },
      message: `Found **${organizations.length}** organizations.`
    };
  })
  .build();
