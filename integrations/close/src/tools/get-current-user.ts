import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the connected Close user, authorized organizations, permissions and email-account identities. Does not change account settings.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      email: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      organizationId: z
        .string()
        .optional()
        .describe('Connected organization, when persisted by authentication.'),
      organizations: z.array(z.object({ organizationId: z.string(), name: z.string() })),
      memberships: z.array(
        z.object({
          membershipId: z.string(),
          organizationId: z.string(),
          roleId: z.string().optional(),
          permissions: z.array(z.string())
        })
      ),
      emailAccounts: z.array(
        z.object({
          emailAccountId: z.string(),
          organizationId: z.string(),
          userId: z.string(),
          identities: z.array(z.object({ email: z.string(), name: z.string().optional() }))
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client(ctx.auth).getMe();
    if (
      (ctx.auth.userId && ctx.auth.userId !== user.id) ||
      (ctx.auth.organizationId &&
        !user.organizations.some(org => org.id === ctx.auth.organizationId))
    )
      throw createApiServiceError(
        'The connected Close user or organization changed. Reconnect.'
      );
    return {
      output: {
        userId: user.id,
        email: user.email,
        firstName: user.first_name ?? undefined,
        lastName: user.last_name ?? undefined,
        organizationId: ctx.auth.organizationId,
        organizations: user.organizations.map(org => ({
          organizationId: org.id,
          name: org.name
        })),
        memberships: user.memberships.map(m => ({
          membershipId: m.id,
          organizationId: m.organization_id,
          roleId: m.role_id ?? undefined,
          permissions: m.permissions_granted
        })),
        emailAccounts: user.email_accounts.map(account => ({
          emailAccountId: account.id,
          organizationId: account.organization_id,
          userId: account.user_id,
          identities: account.identities.map(i => ({
            email: i.email,
            name: i.name ?? undefined
          }))
        }))
      },
      message: `Connected as Close user **${user.id}**.`
    };
  })
  .build();
