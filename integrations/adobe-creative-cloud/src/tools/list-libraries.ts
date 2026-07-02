import { SlateTool } from 'slates';
import { z } from 'zod';
import { LibrariesClient } from '../lib/libraries';
import { spec } from '../spec';

export let listLibraries = SlateTool.create(spec, {
  name: 'List Libraries',
  key: 'list_libraries',
  description: `Browse and retrieve Creative Cloud Libraries for the authenticated user. Returns library names, IDs, metadata, and element counts. Use this to discover available libraries before accessing their contents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of libraries to return (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      libraries: z.array(
        z.object({
          libraryId: z.string().describe('Unique library ID'),
          name: z.string().describe('Library name'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          modifiedAt: z.string().optional().describe('Last modified timestamp'),
          elementCount: z.number().optional().describe('Number of elements in the library')
        })
      ),
      totalCount: z.number().optional().describe('Total number of libraries'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LibrariesClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.listLibraries({
      limit: ctx.input.limit,
      start: ctx.input.cursor
    });

    let libraries = (result.libraries || result.elements || []).map((lib: any) => ({
      libraryId: lib.id || lib.library_urn,
      name: lib.name,
      createdAt: lib.created_date || lib.created,
      modifiedAt: lib.modified_date || lib.modified,
      elementCount: lib.element_count || lib.total_elements_count
    }));

    return {
      output: {
        libraries,
        totalCount: result.total_count,
        nextCursor: result._links?.next?.href
      },
      message: `Found **${libraries.length}** libraries.${libraries.length > 0 ? ` Libraries: ${libraries.map((l: any) => `"${l.name}"`).join(', ')}` : ''}`
    };
  })
  .build();
