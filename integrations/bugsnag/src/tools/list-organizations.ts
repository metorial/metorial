import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let organizationSchema = z.object({
  organizationId: z.string().describe('Unique identifier of the organization'),
  name: z.string().describe('Name of the organization'),
  slug: z.string().optional().describe('URL-friendly slug for the organization'),
  createdAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the organization was created'),
  autoUpgrade: z.boolean().optional().describe('Whether auto-upgrade is enabled'),
  billingEmails: z.string().optional().describe('Billing email address')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all Bugsnag organizations the authenticated user belongs to. Returns organization names, IDs, and metadata. Use this to discover organization IDs needed by other tools.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let orgs = await client.listOrganizations();

    let organizations = orgs.map((org: any) => ({
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.created_at,
      autoUpgrade: org.auto_upgrade,
      billingEmails: org.billing_emails
    }));

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organization(s): ${organizations.map(o => o.name).join(', ')}`
    };
  })
  .build();
