import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hookdeckServiceError, requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let bookmarkSchema = z.object({
  bookmarkId: z.string().describe('Bookmark ID'),
  teamId: z.string().describe('Team/project ID'),
  label: z.string().describe('Bookmark label'),
  eventDataId: z.string().describe('Event data ID associated with the bookmark'),
  connectionId: z.string().describe('Connection (webhook) ID associated with the bookmark'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageBookmarks = SlateTool.create(spec, {
  name: 'Manage Bookmarks',
  key: 'manage_bookmarks',
  description: `Create, update, list, trigger, and delete Hookdeck bookmarks. Bookmarks store and replay common or edge-case requests. Bookmarked data is exempt from archiving. Triggering a bookmark creates a new event (not a retry attempt).`,
  instructions: [
    'Use action "create" to bookmark an event by its eventDataId and connectionId.',
    'Use action "trigger" to replay a bookmarked request, creating a new event on the associated connection.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'trigger', 'delete'])
        .describe('Action to perform'),
      bookmarkId: z
        .string()
        .optional()
        .describe('Bookmark ID (required for get, trigger, delete)'),
      label: z.string().optional().describe('Bookmark label (required for create)'),
      eventDataId: z
        .string()
        .optional()
        .describe('Event data ID to bookmark (required for create)'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID for the bookmark (required for create)'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      bookmark: bookmarkSchema.optional().describe('Single bookmark'),
      bookmarks: z.array(bookmarkSchema).optional().describe('List of bookmarks'),
      triggeredEventId: z
        .string()
        .optional()
        .describe('ID of the event created by triggering a bookmark'),
      deletedId: z.string().optional().describe('ID of the deleted bookmark'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapBookmark = (b: any) => ({
      bookmarkId: b.id as string,
      teamId: b.team_id as string,
      label: b.label as string,
      eventDataId: b.event_data_id as string,
      connectionId: b.webhook_id as string,
      createdAt: b.created_at as string,
      updatedAt: b.updated_at as string
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listBookmarks({
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            bookmarks: result.models.map(b => mapBookmark(b)),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** bookmarks (${result.count} total).`
        };
      }
      case 'get': {
        let bookmarkId = requireHookdeckInput(ctx.input.bookmarkId, 'bookmarkId', 'get');
        let bookmark = await client.getBookmark(bookmarkId);
        return {
          output: { bookmark: mapBookmark(bookmark) },
          message: `Retrieved bookmark **${bookmark.label}** (\`${bookmark.id}\`).`
        };
      }
      case 'create': {
        let label = requireHookdeckInput(ctx.input.label, 'label', 'create');
        let eventDataId = requireHookdeckInput(ctx.input.eventDataId, 'eventDataId', 'create');
        let connectionId = requireHookdeckInput(
          ctx.input.connectionId,
          'connectionId',
          'create'
        );
        let bookmark = await client.createBookmark({
          label,
          event_data_id: eventDataId,
          webhook_id: connectionId
        });
        return {
          output: { bookmark: mapBookmark(bookmark) },
          message: `Created bookmark **${bookmark.label}** (\`${bookmark.id}\`).`
        };
      }
      case 'update': {
        let bookmarkId = requireHookdeckInput(ctx.input.bookmarkId, 'bookmarkId', 'update');
        if (!ctx.input.label && !ctx.input.eventDataId && !ctx.input.connectionId) {
          throw hookdeckServiceError(
            'label, eventDataId, or connectionId is required for "update".'
          );
        }
        let bookmark = await client.updateBookmark(bookmarkId, {
          label: ctx.input.label,
          event_data_id: ctx.input.eventDataId,
          webhook_id: ctx.input.connectionId
        });
        return {
          output: { bookmark: mapBookmark(bookmark) },
          message: `Updated bookmark **${bookmark.label}** (\`${bookmark.id}\`).`
        };
      }
      case 'trigger': {
        let bookmarkId = requireHookdeckInput(ctx.input.bookmarkId, 'bookmarkId', 'trigger');
        let event = await client.triggerBookmark(bookmarkId);
        return {
          output: { triggeredEventId: event.id },
          message: `Triggered bookmark \`${bookmarkId}\`, created new event \`${event.id}\`.`
        };
      }
      case 'delete': {
        let bookmarkId = requireHookdeckInput(ctx.input.bookmarkId, 'bookmarkId', 'delete');
        let result = await client.deleteBookmark(bookmarkId);
        return {
          output: { deletedId: result.id },
          message: `Deleted bookmark \`${result.id}\`.`
        };
      }
    }
  })
  .build();
