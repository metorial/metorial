import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAuthInfo = SlateTool.create(spec, {
  name: 'Get Authentication Info',
  key: 'get_auth_info',
  description:
    'Inspect the current token identity, account or organization scope, permissions, and expiry. Use entityId as teamId when entityType is team, or call list_teams for an organization-scoped token.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tokenKind: z.string(),
      id: z.string(),
      name: z.string().optional(),
      entityId: z.string(),
      entityUid: z.string(),
      entityType: z.string(),
      orgId: z.string().optional(),
      creatorEmail: z.string().optional(),
      createdAt: z.string(),
      expiresAt: z.string().nullable().optional(),
      permissions: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let identity = await new Client({ token: ctx.auth.token }).getAuthInfo();
    return {
      output: identity,
      message: `Authenticated as **${identity.name ?? identity.id}**, scoped to ${identity.entityType} **${identity.entityId}**.`
    };
  })
  .build();
