import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description:
    'Lists organizations accessible to the MaintainX API key. Use organizationId from this result with other tools when the key spans multiple organizations.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum results per page; defaults to 100'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string().describe('Organization ID to pass to other tools'),
          name: z.string().describe('Organization name'),
          timeZone: z.string().optional().describe('Organization time zone'),
          currency: z.string().optional().describe('Organization currency')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listOrganizations(ctx.input);
    let organizations = (result.organizations ?? []).map(
      (organization: {
        id: number;
        name: string;
        timeZone?: string;
        currency?: string | null;
      }) => ({
        organizationId: String(organization.id),
        name: organization.name,
        timeZone: organization.timeZone ?? undefined,
        currency: organization.currency ?? undefined
      })
    );
    return {
      output: { organizations, nextCursor: result.nextCursor ?? undefined },
      message: `Found ${organizations.length} organization(s).`
    };
  })
  .build();
