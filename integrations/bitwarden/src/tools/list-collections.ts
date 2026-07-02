import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionId: z.string().describe('Unique ID of the collection'),
  externalId: z.string().nullable().describe('External ID for directory sync'),
  groups: z
    .array(
      z.object({
        groupId: z.string().describe('Group ID'),
        readOnly: z.boolean().describe('Whether group access is read-only')
      })
    )
    .describe('Groups assigned to this collection')
});

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all collections in the Bitwarden organization. Returns each collection's external ID and group assignments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('List of organization collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    let collections = await client.listCollections();

    let mapped = collections.map(c => ({
      collectionId: c.id,
      externalId: c.externalId,
      groups: c.groups.map(g => ({
        groupId: g.id,
        readOnly: g.readOnly
      }))
    }));

    return {
      output: { collections: mapped },
      message: `Found **${mapped.length}** collection(s).`
    };
  })
  .build();
