import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateEntry = SlateTool.create(spec, {
  name: 'Update Entry',
  key: 'update_entry',
  description: `Update an existing entry's fields. Fetches the current version automatically if not provided. Optionally publish the updated entry.`,
  instructions: [
    'Fields must be structured with locale keys, e.g. {"title": {"en-US": "Updated Title"}}.',
    'Provide the full fields object — partial field updates replace the entire fields payload.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      entryId: z.string().describe('ID of the entry to update.'),
      fields: z
        .record(z.string(), z.any())
        .describe('Complete entry fields keyed by field ID with locale sub-keys.'),
      version: z
        .number()
        .optional()
        .describe(
          'Current version of the entry. If omitted, the latest version is fetched automatically.'
        ),
      publish: z.boolean().optional().describe('If true, publish the entry after updating.')
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('ID of the updated entry.'),
      version: z.number().describe('New version number after update.'),
      published: z.boolean().describe('Whether the entry was published.'),
      updatedAt: z.string().optional().describe('ISO 8601 update timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let version = ctx.input.version;
    if (!version) {
      let current = await client.getEntry(ctx.input.entryId);
      version = current.sys.version;
    }

    let entry = await client.updateEntry(ctx.input.entryId, ctx.input.fields, version!);

    let published = false;
    if (ctx.input.publish) {
      entry = await client.publishEntry(entry.sys.id, entry.sys.version);
      published = true;
    }

    return {
      output: {
        entryId: entry.sys.id,
        version: entry.sys.version,
        published,
        updatedAt: entry.sys.updatedAt
      },
      message: `Updated entry **${entry.sys.id}** to version ${entry.sys.version}${published ? ' and published it' : ''}.`
    };
  })
  .build();
