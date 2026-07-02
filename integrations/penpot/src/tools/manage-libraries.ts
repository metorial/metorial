import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLibrariesTool = SlateTool.create(spec, {
  name: 'Manage Libraries',
  key: 'manage_libraries',
  description: `List, link, or unlink shared design libraries for a file. Libraries provide reusable components, colors, and typographies across files.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'link', 'unlink'])
        .describe(
          'Operation: "list" returns linked libraries, "link" connects a library, "unlink" disconnects a library'
        ),
      fileId: z.string().describe('ID of the file'),
      libraryId: z
        .string()
        .optional()
        .describe('ID of the library file to link/unlink (required for "link" and "unlink")')
    })
  )
  .output(
    z.object({
      libraries: z
        .array(z.any())
        .optional()
        .describe('List of linked libraries (for "list" action)'),
      success: z.boolean().optional().describe('Whether the link/unlink operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { action, fileId, libraryId } = ctx.input;

    switch (action) {
      case 'list': {
        let libraries = await client.getFileLibraries(fileId);
        let libArray = Array.isArray(libraries) ? libraries : [];
        return {
          output: { libraries: libArray },
          message: `Found **${libArray.length}** linked library(ies).`
        };
      }
      case 'link': {
        if (!libraryId) throw new Error('libraryId is required for link action');
        await client.linkFileToLibrary(fileId, libraryId);
        return {
          output: { success: true },
          message: `Linked library \`${libraryId}\` to file.`
        };
      }
      case 'unlink': {
        if (!libraryId) throw new Error('libraryId is required for unlink action');
        await client.unlinkFileFromLibrary(fileId, libraryId);
        return {
          output: { success: true },
          message: `Unlinked library \`${libraryId}\` from file.`
        };
      }
    }
  })
  .build();
