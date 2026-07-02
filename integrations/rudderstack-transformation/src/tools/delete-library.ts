import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLibrary = SlateTool.create(spec, {
  name: 'Delete Library',
  key: 'delete_library',
  description: `Delete a reusable code library by its ID. The library will be removed, but all its version revisions are permanently preserved.`,
  constraints: [
    'Revisions are never deleted, even when the library is deleted.',
    'Ensure no active transformations depend on this library before deleting.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      libraryId: z.string().describe('ID of the library to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.deleteLibrary(ctx.input.libraryId);

    return {
      output: { success: true },
      message: `Deleted library \`${ctx.input.libraryId}\`. Revisions are preserved.`
    };
  })
  .build();
