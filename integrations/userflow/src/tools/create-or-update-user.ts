import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attributeOperationSchema = z
  .union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.unknown()),
    z.object({
      set: z.unknown().optional(),
      set_once: z.unknown().optional(),
      add: z.number().optional(),
      subtract: z.number().optional(),
      append: z.array(z.unknown()).optional(),
      prepend: z.array(z.unknown()).optional(),
      remove: z.array(z.unknown()).optional()
    })
  ])
  .describe(
    'Attribute value or operation object (set, set_once, add, subtract, append, prepend, remove)'
  );

let groupEmbedSchema = z
  .object({
    groupId: z.string().describe('ID of the group to associate the user with'),
    attributes: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Attributes to set on the group')
  })
  .describe('Group to associate with the user');

let membershipEmbedSchema = z
  .object({
    group: z
      .object({
        groupId: z.string().describe('ID of the group'),
        attributes: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Attributes to set on the group')
      })
      .describe('Group reference for the membership'),
    attributes: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Membership-level attributes (e.g. role)')
  })
  .describe('Membership to associate with the user');

export let createOrUpdateUser = SlateTool.create(spec, {
  name: 'Create or Update User',
  key: 'create_or_update_user',
  description: `Creates a new user or updates an existing one (upsert). If the user does not exist, it will be created; if it exists, given attributes are merged into the existing user's attributes. Supports attribute operations like **set_once**, **add** (increment numbers), **append** (add to arrays), and more. Can also associate the user with groups/companies in the same request.`,
  instructions: [
    'Only one of groups or memberships can be provided per request. Use memberships if you need membership-level attributes like role.',
    'Set an attribute value to null to remove it.',
    'Use pruneMemberships=true to remove group memberships not included in the request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Unique identifier for the user'),
      attributes: z
        .record(z.string(), attributeOperationSchema)
        .optional()
        .describe('User attributes to set or update'),
      groups: z
        .array(groupEmbedSchema)
        .optional()
        .describe('Groups to associate user with (cannot be combined with memberships)'),
      memberships: z
        .array(membershipEmbedSchema)
        .optional()
        .describe(
          'Memberships with group and membership-level attributes (cannot be combined with groups)'
        ),
      pruneMemberships: z
        .boolean()
        .optional()
        .describe('If true, removes memberships not included in this request')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      attributes: z.record(z.string(), z.unknown()).describe('Current user attributes'),
      createdAt: z.string().describe('Timestamp when the user was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let groups = ctx.input.groups?.map(g => ({
      id: g.groupId,
      attributes: g.attributes
    }));

    let memberships = ctx.input.memberships?.map(m => ({
      group: {
        id: m.group.groupId,
        attributes: m.group.attributes
      },
      attributes: m.attributes
    }));

    let user = await client.createOrUpdateUser({
      userId: ctx.input.userId,
      attributes: ctx.input.attributes,
      groups,
      memberships,
      pruneMemberships: ctx.input.pruneMemberships
    });

    return {
      output: {
        userId: user.id,
        attributes: user.attributes,
        createdAt: user.created_at
      },
      message: `User **${user.id}** has been created or updated successfully.`
    };
  })
  .build();
