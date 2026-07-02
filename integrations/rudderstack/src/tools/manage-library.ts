import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageLibrary = SlateTool.create(spec, {
  name: 'Manage Library',
  key: 'manage_library',
  description: `Create, update, or delete a RudderStack transformation library. Libraries are reusable JavaScript or Python modules that can be imported and shared across multiple transformations.
Supports creating new libraries, updating code/description, publishing, and deleting libraries.`,
  instructions: [
    'Library names cannot be changed after creation.',
    'The programming language of a library cannot be changed after creation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      libraryId: z.string().optional().describe('Library ID (required for update and delete)'),
      name: z.string().optional().describe('Library name (required for create)'),
      code: z.string().optional().describe('JavaScript or Python library code'),
      language: z
        .enum(['javascript', 'python'])
        .optional()
        .describe('Programming language of the library code'),
      description: z.string().optional().describe('Description of the library'),
      publish: z.boolean().optional().describe('Whether to publish the library')
    })
  )
  .output(
    z.object({
      libraryId: z.string().optional().describe('ID of the library'),
      name: z.string().optional().describe('Name of the library'),
      versionId: z.string().optional().describe('Version/revision ID'),
      published: z.boolean().optional().describe('Whether the library is published'),
      deleted: z.boolean().optional().describe('Whether the library was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, libraryId, name, code, language, description, publish } = ctx.input;

    if (action === 'create') {
      if (!name) throw new Error('Name is required when creating a library.');
      if (!code) throw new Error('Code is required when creating a library.');

      let result = await client.createLibrary({ name, code, language, description, publish });
      let library = result.library || result;

      return {
        output: {
          libraryId: library.id,
          name: library.name,
          versionId: library.versionId,
          published: !!publish
        },
        message: `Created library **${library.name}**${publish ? ' and published it' : ''}.`
      };
    }

    if (action === 'update') {
      if (!libraryId) throw new Error('Library ID is required for update.');

      let result = await client.updateLibrary(libraryId, { code, description, publish });
      let library = result.library || result;

      return {
        output: {
          libraryId: library.id || libraryId,
          name: library.name,
          versionId: library.versionId,
          published: !!publish
        },
        message: `Updated library \`${libraryId}\`${publish ? ' and published it' : ''}.`
      };
    }

    if (action === 'delete') {
      if (!libraryId) throw new Error('Library ID is required for delete.');

      await client.deleteLibrary(libraryId);

      return {
        output: {
          libraryId,
          deleted: true
        },
        message: `Deleted library \`${libraryId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
