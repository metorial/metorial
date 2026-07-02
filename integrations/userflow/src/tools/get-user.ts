import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieves a user by ID or finds a user by email. Returns the user's attributes, groups, and memberships. Supports expanding related objects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('ID of the user to retrieve'),
      email: z.string().optional().describe('Email to search for (used with find endpoint)'),
      groupId: z.string().optional().describe('Filter by group ID when searching by email'),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. memberships, memberships.group, groups)')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      attributes: z.record(z.string(), z.unknown()).describe('User attributes'),
      createdAt: z.string().describe('Timestamp when the user was created'),
      groups: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .nullable()
        .describe('Associated groups if expanded'),
      memberships: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .nullable()
        .describe('Associated memberships if expanded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let user: any;
    if (ctx.input.userId && !ctx.input.email) {
      user = await client.getUser(ctx.input.userId, ctx.input.expand);
    } else if (ctx.input.email) {
      user = await client.findUser({
        userId: ctx.input.userId,
        email: ctx.input.email,
        groupId: ctx.input.groupId
      });
    } else {
      throw new Error('Either userId or email must be provided');
    }

    return {
      output: {
        userId: user.id,
        attributes: user.attributes,
        createdAt: user.created_at,
        groups: user.groups as unknown as Record<string, unknown>[] | null,
        memberships: user.memberships as unknown as Record<string, unknown>[] | null
      },
      message: `Retrieved user **${user.id}**${user.attributes.name ? ` (${user.attributes.name})` : ''}.`
    };
  })
  .build();
