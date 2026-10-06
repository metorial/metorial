import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
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
  description: `List a page of Bugsnag organizations the authenticated user belongs to. Returns organization names, IDs, and metadata. Use this to discover organization IDs needed by other tools.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...pageInput,
      perPage: z.number().optional().describe('Results per page (1 to 100)')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      organizations: z.array(organizationSchema).describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let orgs = await client.listOrganizations(ctx.input);

    let organizations = orgs.map(org => ({
      organizationId: org.id ?? undefined,
      name: org.name ?? undefined,
      slug: org.slug ?? undefined,
      createdAt: org.created_at ?? undefined,
      autoUpgrade: org.auto_upgrade ?? undefined,
      billingEmails: org.billing_emails?.join(', ')
    }));

    return {
      output: { organizations, ...client.pageInfo },
      message: `Found **${organizations.length}** organization(s): ${organizations.map(o => o.name).join(', ')}`
    };
  })
  .build();
