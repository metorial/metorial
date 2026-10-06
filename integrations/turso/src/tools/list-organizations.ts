import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description:
    'List authorized Turso organizations. Use organizationSlug from the result in database, group, member and audit tools.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationName: z.string(),
          organizationSlug: z.string(),
          type: z.string(),
          overages: z.boolean(),
          blockedReads: z.boolean(),
          blockedWrites: z.boolean(),
          planId: z.string().optional(),
          requireMfa: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listOrganizations();
    return {
      output: {
        organizations: result.map(org => ({
          organizationName: org.name,
          organizationSlug: org.slug,
          type: org.type,
          overages: org.overages,
          blockedReads: org.blocked_reads,
          blockedWrites: org.blocked_writes,
          planId: org.plan_id,
          requireMfa: org.require_mfa
        }))
      },
      message: `Found **${result.length}** authorized organization(s).`
    };
  })
  .build();
