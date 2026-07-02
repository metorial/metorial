import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrUpdateGroup = SlateTool.create(spec, {
  name: 'Create or Update Group',
  key: 'create_or_update_group',
  description: `Creates a new group (company) or updates an existing one (upsert). Groups represent companies, accounts, or tenants. If the group does not exist, it will be created; if it exists, given attributes are merged. Supports the same attribute operations as users (**set**, **set_once**, **add**, **append**, etc.).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Unique identifier for the group'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Group attributes to set or update')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('ID of the group'),
      attributes: z.record(z.string(), z.unknown()).describe('Current group attributes'),
      createdAt: z.string().describe('Timestamp when the group was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let group = await client.createOrUpdateGroup({
      groupId: ctx.input.groupId,
      attributes: ctx.input.attributes
    });

    return {
      output: {
        groupId: group.id,
        attributes: group.attributes,
        createdAt: group.created_at
      },
      message: `Group **${group.id}** has been created or updated successfully.`
    };
  })
  .build();
