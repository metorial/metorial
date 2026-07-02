import { SlateTool } from 'slates';
import { z } from 'zod';
import { LibrariesClient } from '../lib/libraries';
import { spec } from '../spec';

export let listLibraryElements = SlateTool.create(spec, {
  name: 'List Library Elements',
  key: 'list_library_elements',
  description: `Retrieve elements (colors, character styles, logos, images, graphics) from a specific Creative Cloud Library. Returns element types, names, thumbnails, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      libraryId: z.string().describe('ID of the library to list elements from'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of elements to return (default: 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      elements: z.array(
        z.object({
          elementId: z.string().describe('Unique element ID'),
          name: z.string().describe('Element name'),
          type: z
            .string()
            .describe('Element type (e.g. color, image, graphic, characterStyle)'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          modifiedAt: z.string().optional().describe('Last modified timestamp'),
          thumbnailUrl: z.string().optional().describe('Thumbnail URL for the element')
        })
      ),
      totalCount: z.number().optional().describe('Total number of elements'),
      nextCursor: z.string().optional().describe('Cursor for next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LibrariesClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result = await client.listElements(ctx.input.libraryId, {
      limit: ctx.input.limit,
      start: ctx.input.cursor
    });

    let elements = (result.elements || []).map((el: any) => ({
      elementId: el.id || el.element_id,
      name: el.name,
      type: el.type || el.element_type,
      createdAt: el.created_date || el.created,
      modifiedAt: el.modified_date || el.modified,
      thumbnailUrl: el.thumbnail?.href || el.thumbnail_url
    }));

    return {
      output: {
        elements,
        totalCount: result.total_count,
        nextCursor: result._links?.next?.href
      },
      message: `Found **${elements.length}** elements in library \`${ctx.input.libraryId}\`.`
    };
  })
  .build();
