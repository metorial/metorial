import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metaValue = z.union([z.string(), z.number(), z.boolean()]);

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieves a user's full profile from Engage by their unique identifier. Returns all standard attributes, custom metadata, list subscriptions, account associations, device tokens, and message stats.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      uid: z.string().describe('The unique user identifier from your application')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Internal Engage user ID'),
      uid: z.string().describe('Application-supplied unique identifier'),
      firstName: z.string().nullable().describe('User first name'),
      lastName: z.string().nullable().describe('User last name'),
      email: z.string().nullable().describe('User email'),
      phone: z.string().nullable().describe('User phone number'),
      isAccount: z.boolean().describe('Whether the user is an Account'),
      archived: z.boolean().describe('Whether the user is archived'),
      createdAt: z.string().describe('Creation timestamp'),
      lastInteraction: z.string().nullable().describe('Last interaction timestamp'),
      meta: z.record(z.string(), metaValue).describe('Custom attributes'),
      lists: z
        .array(
          z.object({
            listId: z.string(),
            subscribed: z.boolean()
          })
        )
        .describe('Lists the user belongs to'),
      accounts: z
        .array(
          z.object({
            accountId: z.string(),
            role: z.string().nullable()
          })
        )
        .describe('Accounts the user belongs to'),
      devices: z
        .array(
          z.object({
            deviceToken: z.string(),
            platform: z.string()
          })
        )
        .describe('Registered device tokens'),
      memberCount: z.number().nullable().describe('Number of members (if Account)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret
    });

    let user = await client.getUser(ctx.input.uid);

    return {
      output: {
        userId: user.id,
        uid: user.uid,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.number,
        isAccount: user.is_account,
        archived: user.archived,
        createdAt: user.created_at,
        lastInteraction: user.last_interaction,
        meta: (user.meta || {}) as Record<string, string | number | boolean>,
        lists: (user.lists || []).map(l => ({ listId: l.id, subscribed: l.subscribed })),
        accounts: (user.accounts || []).map(a => ({ accountId: a.id, role: a.role })),
        devices: (user.devices || []).map(d => ({
          deviceToken: d.token,
          platform: d.platform
        })),
        memberCount: user.member_count
      },
      message: `Retrieved user **${user.uid}** (${user.first_name || ''} ${user.last_name || ''}).`
    };
  })
  .build();
