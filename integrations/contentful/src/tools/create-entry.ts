import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
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
      contentTypeId: z.string().describe('The content type ID for the new entry.'),
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
      entryId: z.string().describe('ID of the created entry.'),
      contentTypeId: z.string().describe('Content type ID.'),
      version: z.number().describe('Current version number.'),
      published: z.boolean().describe('Whether the entry was published.'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let entry = await client.createEntry(ctx.input.contentTypeId, ctx.input.fields);

    let published = false;
    if (ctx.input.publish) {
      entry = await client.publishEntry(entry.sys.id, entry.sys.version);
      published = true;
    }

    return {
      output: {
        entryId: entry.sys.id,
        contentTypeId: ctx.input.contentTypeId,
        version: entry.sys.version,
        published,
        createdAt: entry.sys.createdAt
      },
      message: `Created entry **${entry.sys.id}**${published ? ' and published it' : ''}.`
    };
  })
  .build();
