import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contentOutputSchema = z.object({
  contentId: z.string().describe('Content item ID'),
  parentId: z.string().optional().describe('Parent content ID'),
  title: z.string().describe('Content title'),
  body: z.string().optional().describe('Content body (HTML)'),
  description: z.string().optional().describe('Content description'),
  position: z.number().optional().describe('Position in the content list'),
  contentHandlerId: z.string().optional().describe('Content handler type'),
  available: z.string().optional().describe('Availability status'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp')
});

let mapContent = (c: any) => ({
  contentId: c.id,
  parentId: c.parentId,
  title: c.title,
  body: c.body,
  description: c.description,
  position: c.position,
  contentHandlerId: c.contentHandler?.id,
  available: c.availability?.available,
  created: c.created,
  modified: c.modified
});

export let createContent = SlateTool.create(spec, {
  name: 'Create Course Content',
  key: 'create_content',
  description: `Create a content item in a course. Supports documents, folders, links, and other content types. Optionally place it inside a parent folder.`,
  instructions: [
    'Common content handler IDs: `resource/x-bb-document` (document), `resource/x-bb-folder` (folder), `resource/x-bb-externallink` (external link), `resource/x-bb-blankpage` (blank page).',
    'To create a link, set contentHandlerId to `resource/x-bb-externallink` and provide the URL in the body.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      title: z.string().describe('Content title'),
      body: z.string().optional().describe('Content body (HTML)'),
      description: z.string().optional().describe('Content description'),
      parentId: z
        .string()
        .optional()
        .describe('Parent folder ID — omit to add to the top level'),
      position: z.number().optional().describe('Position among siblings (0-based)'),
      contentHandlerId: z
        .string()
        .optional()
        .describe('Content handler type (e.g., "resource/x-bb-document")'),
      contentHandlerUrl: z.string().optional().describe('URL for external links'),
      available: z.enum(['Yes', 'No']).optional().describe('Whether the content is available'),
      releaseStart: z.string().optional().describe('Adaptive release start date (ISO 8601)'),
      releaseEnd: z.string().optional().describe('Adaptive release end date (ISO 8601)')
    })
  )
  .output(contentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let content = await client.createContent(ctx.input.courseId, {
      title: ctx.input.title,
      body: ctx.input.body,
      description: ctx.input.description,
      parentId: ctx.input.parentId,
      position: ctx.input.position,
      contentHandler: ctx.input.contentHandlerId
        ? {
            id: ctx.input.contentHandlerId,
            url: ctx.input.contentHandlerUrl
          }
        : undefined,
      availability: {
        available: ctx.input.available,
        adaptiveRelease:
          ctx.input.releaseStart || ctx.input.releaseEnd
            ? {
                start: ctx.input.releaseStart,
                end: ctx.input.releaseEnd
              }
            : undefined
      }
    });

    return {
      output: mapContent(content),
      message: `Created content **${content.title}** in course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let getContent = SlateTool.create(spec, {
  name: 'Get Course Content',
  key: 'get_content',
  description: `Retrieve a specific content item from a course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      contentId: z.string().describe('Content item ID')
    })
  )
  .output(contentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let content = await client.getContent(ctx.input.courseId, ctx.input.contentId);

    return {
      output: mapContent(content),
      message: `Retrieved content **${content.title}**.`
    };
  })
  .build();

export let listContent = SlateTool.create(spec, {
  name: 'List Course Content',
  key: 'list_content',
  description: `List content items in a course. By default lists top-level content. Provide a parentId to list children of a folder.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      parentId: z
        .string()
        .optional()
        .describe('Parent folder ID — omit for top-level content'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      items: z.array(contentOutputSchema),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = ctx.input.parentId
      ? await client.listContentChildren(ctx.input.courseId, ctx.input.parentId, {
          offset: ctx.input.offset,
          limit: ctx.input.limit
        })
      : await client.listCourseContent(ctx.input.courseId, {
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });

    let items = (result.results || []).map(mapContent);

    return {
      output: { items, hasMore: !!result.paging?.nextPage },
      message: `Found **${items.length}** content item(s).`
    };
  })
  .build();

export let updateContent = SlateTool.create(spec, {
  name: 'Update Course Content',
  key: 'update_content',
  description: `Update a content item in a course. Only provided fields will be changed.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      contentId: z.string().describe('Content item ID'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body (HTML)'),
      description: z.string().optional().describe('New description'),
      position: z.number().optional().describe('New position'),
      available: z.enum(['Yes', 'No']).optional().describe('Availability status'),
      releaseStart: z.string().optional().describe('Adaptive release start date (ISO 8601)'),
      releaseEnd: z.string().optional().describe('Adaptive release end date (ISO 8601)')
    })
  )
  .output(contentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let content = await client.updateContent(ctx.input.courseId, ctx.input.contentId, {
      title: ctx.input.title,
      body: ctx.input.body,
      description: ctx.input.description,
      position: ctx.input.position,
      availability: {
        available: ctx.input.available,
        adaptiveRelease:
          ctx.input.releaseStart || ctx.input.releaseEnd
            ? {
                start: ctx.input.releaseStart,
                end: ctx.input.releaseEnd
              }
            : undefined
      }
    });

    return {
      output: mapContent(content),
      message: `Updated content **${content.title}**.`
    };
  })
  .build();

export let deleteContent = SlateTool.create(spec, {
  name: 'Delete Course Content',
  key: 'delete_content',
  description: `Delete a content item from a course. This also removes all child items if the content is a folder.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      contentId: z.string().describe('Content item ID')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the content was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    await client.deleteContent(ctx.input.courseId, ctx.input.contentId);
    return {
      output: { deleted: true },
      message: `Deleted content **${ctx.input.contentId}** from course **${ctx.input.courseId}**.`
    };
  })
  .build();
