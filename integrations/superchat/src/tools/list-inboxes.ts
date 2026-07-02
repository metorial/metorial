import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let inboxSchema = z.object({
  inboxId: z.string().describe('Unique inbox identifier'),
  inboxUrl: z.string().optional().describe('Resource URL'),
  name: z.string().optional().describe('Inbox name'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapInbox = (inbox: any) => ({
  inboxId: inbox.id,
  inboxUrl: inbox.url,
  name: inbox.name,
  createdAt: inbox.created_at,
  updatedAt: inbox.updated_at
});

export let listInboxes = SlateTool.create(spec, {
  name: 'List Inboxes',
  key: 'list_inboxes',
  description: `List all inboxes in the workspace. Inboxes represent how conversations are routed and organized among team members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of inboxes to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      inboxes: z.array(inboxSchema).describe('List of inboxes'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listInboxes({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let inboxes = (result.results || []).map(mapInbox);

    return {
      output: {
        inboxes,
        pagination: result.pagination
      },
      message: `Retrieved **${inboxes.length}** inbox(es).`
    };
  })
  .build();

export let getInbox = SlateTool.create(spec, {
  name: 'Get Inbox',
  key: 'get_inbox',
  description: `Retrieve details of a specific inbox by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox to retrieve')
    })
  )
  .output(inboxSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getInbox(ctx.input.inboxId);

    return {
      output: mapInbox(result),
      message: `Retrieved inbox **${result.name || result.id}**.`
    };
  })
  .build();
