import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { currentVersion, recovery, resourceId, selection } from '../lib/schemas';
import { spec } from '../spec';

export let createEntry = SlateTool.create(spec, {
  name: 'Create Entry',
  key: 'create_entry',
  description: `Create a new entry for a given content type. Provide fields as a locale-keyed object. Optionally publish the entry immediately after creation.`,
  instructions: [
    'Fields must be structured with locale keys, e.g. {"title": {"en-US": "Hello"}}.',
    'Set publish to true to automatically publish the entry after creation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...selection,
      contentTypeId: resourceId.describe('The content type ID for the new entry.'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Entry fields keyed by field ID with locale sub-keys, e.g. {"title": {"en-US": "My Title"}}.'
        ),
      publish: z
        .boolean()
        .optional()
        .describe('If true, publish the entry immediately after creation.')
    })
  )
  .output(
    z.object({
      entryId: resourceId.describe('ID of the created entry.'),
      contentTypeId: resourceId.describe('Content type ID.'),
      version: z.number().describe('Current version number.'),
      published: z.boolean().describe('Whether the entry was published.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let entry = await client.createEntry(ctx.input.contentTypeId, ctx.input.fields);

    let published = false;
    if (ctx.input.publish) {
      try {
        entry = await client.publishEntry(entry.sys.id, currentVersion(entry));
      } catch {
        throw recovery('entry', entry.sys.id, client.spaceId, client.environmentId);
      }
      published = true;
    }

    return {
      output: {
        entryId: entry.sys.id,
        contentTypeId: ctx.input.contentTypeId,
        version: currentVersion(entry),
        published,
        createdAt: entry.sys.createdAt
      },
      message: `Created entry **${entry.sys.id}**${published ? ' and published it' : ''}.`
    };
  })
  .build();
