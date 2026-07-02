import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('Unique ID of the group'),
  name: z.string().describe('Name of the group'),
  accessAll: z.boolean().describe('Whether the group has access to all collections'),
  externalId: z.string().nullable().describe('External ID for directory sync'),
  collections: z
    .array(
      z.object({
        collectionId: z.string().describe('Collection ID'),
        readOnly: z.boolean().describe('Whether access is read-only')
      })
    )
    .describe('Collections assigned to this group')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in the Bitwarden organization. Returns each group's name, access settings, external ID, and collection assignments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(groupSchema).describe('List of organization groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let groups = await client.listGroups();

    let mapped = groups.map(g => ({
      groupId: g.id,
      name: g.name,
      accessAll: g.accessAll,
      externalId: g.externalId,
      collections: g.collections.map(c => ({
        collectionId: c.id,
        readOnly: c.readOnly
      }))
    }));

    return {
      output: { groups: mapped },
      message: `Found **${mapped.length}** group(s).`
    };
  })
  .build();
