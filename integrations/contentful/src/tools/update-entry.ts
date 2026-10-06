import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  currentVersion,
  recovery,
  resourceId,
  selection,
  versionSchema
} from '../lib/schemas';
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
      ...selection,
      entryId: resourceId.describe('ID of the entry to update.'),
      fields: z
        .record(z.string(), z.any())
        .describe('Complete entry fields keyed by field ID with locale sub-keys.'),
      version: versionSchema
        .optional()
        .describe(
          'Current version of the entry. If omitted, the latest version is fetched automatically.'
        ),
      publish: z.boolean().optional().describe('If true, publish the entry after updating.')
    })
  )
  .output(
    z.object({
      entryId: resourceId.describe('ID of the updated entry.'),
      version: z.number().describe('New version number after update.'),
      published: z.boolean().describe('Whether the entry was published.'),
      updatedAt: z.string().optional().describe('ISO 8601 update timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);

    let version = ctx.input.version;
    if (version === undefined) {
      let current = await client.getEntry(ctx.input.entryId);
      version = currentVersion(current);
    }

    let entry = await client.updateEntry(ctx.input.entryId, ctx.input.fields, version!);

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
        version: currentVersion(entry),
        published,
        updatedAt: entry.sys.updatedAt
      },
      message: `Updated entry **${entry.sys.id}** to version ${entry.sys.version}${published ? ' and published it' : ''}.`
    };
  })
  .build();
