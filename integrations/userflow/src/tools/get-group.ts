import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description: `Retrieves a group (company) by its ID. Returns the group's attributes and optionally its memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to retrieve'),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. memberships, memberships.user)')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the group'),
      attributes: z.record(z.string(), z.unknown()).describe('Group attributes'),
      createdAt: z.string().describe('Timestamp when the group was created'),
      memberships: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .nullable()
        .describe('Group memberships if expanded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let group = await client.getGroup(ctx.input.groupId, ctx.input.expand);

    return {
      output: {
        groupId: group.id,
        attributes: group.attributes,
        createdAt: group.created_at,
        memberships: group.memberships as unknown as Record<string, unknown>[] | null
      },
      message: `Retrieved group **${group.id}**${group.attributes.name ? ` (${group.attributes.name})` : ''}.`
    };
  })
  .build();
