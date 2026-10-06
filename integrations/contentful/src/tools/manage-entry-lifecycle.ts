import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { currentVersion, resourceId, selection, versionSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageEntryLifecycle = SlateTool.create(spec, {
  name: 'Manage Entry Lifecycle',
  key: 'manage_entry_lifecycle',
  description: `Perform lifecycle actions on an entry: publish, unpublish, archive, unarchive, or delete. Fetches the current version automatically if not provided.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ...selection,
      entryId: resourceId.describe('ID of the entry.'),
      action: z
        .enum(['publish', 'unpublish', 'archive', 'unarchive', 'delete'])
        .describe('Lifecycle action to perform.'),
      version: versionSchema
        .optional()
        .describe('Current version of the entry. Fetched automatically if omitted.')
    })
  )
  .output(
    z.object({
      entryId: resourceId.describe('ID of the entry.'),
      action: z.string().describe('The action that was performed.'),
      version: z.number().optional().describe('Version after the action, if applicable.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let { entryId, action } = ctx.input;

    let version = ctx.input.version;
    if (version === undefined) {
      let current = await client.getEntry(entryId);
      version = currentVersion(current);
    }

    let result: any;
    switch (action) {
      case 'publish':
        result = await client.publishEntry(entryId, version!);
        break;
      case 'unpublish':
        result = await client.unpublishEntry(entryId, version!);
        break;
      case 'archive':
        result = await client.archiveEntry(entryId, version!);
        break;
      case 'unarchive':
        result = await client.unarchiveEntry(entryId, version!);
        break;
      case 'delete':
        await client.deleteEntry(entryId, version!);
        break;
    }

    return {
      output: {
        entryId,
        action,
        version: result?.sys?.version
      },
      message:
        action === 'delete'
          ? `Deleted entry **${entryId}**.`
          : `Entry **${entryId}** has been **${action}ed** (version ${result?.sys?.version}).`
    };
  })
  .build();
