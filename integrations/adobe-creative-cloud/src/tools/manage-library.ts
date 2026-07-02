import { SlateTool } from 'slates';
import { z } from 'zod';
import { LibrariesClient } from '../lib/libraries';
import { spec } from '../spec';

export let manageLibrary = SlateTool.create(spec, {
  name: 'Manage Library',
  key: 'manage_library',
  description: `Create or delete a Creative Cloud Library. Creating a library makes it available across all Adobe applications. Deleting a library permanently removes it and all its elements.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      libraryId: z.string().optional().describe('Library ID (required for delete)'),
      name: z.string().optional().describe('Library name (required for create)')
    })
  )
  .output(
    z.object({
      libraryId: z.string().optional().describe('ID of created/deleted library'),
      name: z.string().optional().describe('Name of created library'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LibrariesClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw new Error('Library name is required for create action');
      }
      let result = await client.createLibrary(ctx.input.name);
      return {
        output: {
          libraryId: result.id || result.library_urn,
          name: result.name || ctx.input.name,
          success: true
        },
        message: `Created library **"${ctx.input.name}"** with ID \`${result.id || result.library_urn}\`.`
      };
    } else {
      if (!ctx.input.libraryId) {
        throw new Error('Library ID is required for delete action');
      }
      await client.deleteLibrary(ctx.input.libraryId);
      return {
        output: {
          libraryId: ctx.input.libraryId,
          success: true
        },
        message: `Deleted library \`${ctx.input.libraryId}\`.`
      };
    }
  })
  .build();
