import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z
  .object({
    handle: z.string().optional().describe('Unique identifier (handle) of the file or folder'),
    name: z.string().optional().describe('Name of the file or folder'),
    type: z.string().optional().describe('Type of the item (e.g., file, directory)'),
    rowCount: z.number().optional().describe('Number of rows in the sheet'),
    columnCount: z.number().optional().describe('Number of columns in the sheet'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    state: z.string().optional().describe('Processing state of the file'),
    size: z.number().optional().describe('File size in bytes')
  })
  .passthrough();

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files and folders in your Gigasheet library. Can list files at the root level, within a specific folder, shared files, or search the library by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      parentHandle: z
        .string()
        .optional()
        .describe('Handle of a folder to list contents of. Omit to list root-level files.'),
      source: z
        .enum(['library', 'shared_with_me'])
        .optional()
        .default('library')
        .describe('Which section of the library to list files from'),
      searchQuery: z
        .string()
        .optional()
        .describe(
          'Search query to find files by name. When provided, parentHandle and source are ignored.'
        )
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('List of files and folders'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });

    let files: unknown[];

    if (ctx.input.searchQuery) {
      files = await client.searchLibrary(ctx.input.searchQuery);
    } else if (ctx.input.source === 'shared_with_me') {
      files = await client.listSharedWithMe(ctx.input.parentHandle);
    } else {
      files = await client.listLibrary(ctx.input.parentHandle);
    }

    let items = Array.isArray(files) ? files : [];

    return {
      output: {
        files: items as z.infer<typeof fileSchema>[],
        count: items.length
      },
      message: `Found **${items.length}** file(s) in the library.`
    };
  })
  .build();
