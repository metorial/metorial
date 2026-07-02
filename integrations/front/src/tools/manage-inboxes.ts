import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInboxes = SlateTool.create(spec, {
  name: 'List Inboxes',
  key: 'list_inboxes',
  description: `List all inboxes (shared and private) available in Front. Optionally includes channels and conversations for each inbox.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      inboxes: z.array(
        z.object({
          inboxId: z.string(),
          name: z.string(),
          isPrivate: z.boolean(),
          isPublic: z.boolean()
        })
      ),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listInboxes({
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit
    });

    let inboxes = result._results.map(i => ({
      inboxId: i.id,
      name: i.name,
      isPrivate: i.is_private,
      isPublic: i.is_public
    }));

    return {
      output: { inboxes, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${inboxes.length}** inboxes.`
    };
  });

export let getInbox = SlateTool.create(spec, {
  name: 'Get Inbox',
  key: 'get_inbox',
  description: `Retrieve details about a specific inbox including its channels and recent conversations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      inboxId: z.string().describe('ID of the inbox'),
      includeChannels: z
        .boolean()
        .optional()
        .describe('Whether to include channels in this inbox')
    })
  )
  .output(
    z.object({
      inboxId: z.string(),
      name: z.string(),
      isPrivate: z.boolean(),
      isPublic: z.boolean(),
      channels: z
        .array(
          z.object({
            channelId: z.string(),
            address: z.string(),
            type: z.string(),
            name: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let inbox = await client.getInbox(ctx.input.inboxId);

    let channels: any;
    if (ctx.input.includeChannels) {
      let channelResult = await client.listInboxChannels(ctx.input.inboxId);
      channels = channelResult._results.map(ch => ({
        channelId: ch.id,
        address: ch.address,
        type: ch.type,
        name: ch.name
      }));
    }

    return {
      output: {
        inboxId: inbox.id,
        name: inbox.name,
        isPrivate: inbox.is_private,
        isPublic: inbox.is_public,
        channels
      },
      message: `Retrieved inbox **${inbox.name}**${channels ? ` with ${channels.length} channels` : ''}.`
    };
  });
