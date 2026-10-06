import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getConnectionContext = SlateTool.create(spec, {
  name: 'Get Connection Context',
  key: 'get_connection_context',
  description:
    'Verify the VirusTotal user bound to this API key and retrieve available native privileges and quota counters. Reconnect with the account username if this connection predates username verification.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      username: z.string(),
      ownerVerified: z.boolean(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      status: z.string().optional(),
      privileges: z
        .record(
          z.string(),
          z.object({ granted: z.boolean().optional(), expirationDate: z.string().optional() })
        )
        .optional(),
      quotas: z
        .record(
          z.string(),
          z.object({ allowed: z.number().optional(), used: z.number().optional() })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client(ctx.auth).getConnectionContext(),
      a = user.attributes;
    return {
      output: {
        userId: user.id,
        username: ctx.auth.username!,
        ownerVerified: true,
        firstName: a?.first_name,
        lastName: a?.last_name,
        email: a?.email,
        status: a?.status,
        privileges: a?.privileges
          ? Object.fromEntries(
              Object.entries(a.privileges).map(([key, value]) => [
                key,
                { granted: value.granted, expirationDate: value.expiration_date?.toString() }
              ])
            )
          : undefined,
        quotas: a?.quotas
          ? Object.fromEntries(
              Object.entries(a.quotas).map(([key, value]) => [
                key,
                { allowed: value.allowed, used: value.used }
              ])
            )
          : undefined
      },
      message:
        'Retrieved the verified account context. Privilege and quota fields omitted by the provider are unknown.'
    };
  })
  .build();
