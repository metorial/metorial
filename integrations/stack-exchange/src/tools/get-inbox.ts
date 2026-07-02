import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inboxItemSchema = z.object({
  itemType: z.string().optional().describe('Type of inbox item (e.g., comment, answer)'),
  title: z.string().optional().describe('Title or summary of the inbox item'),
  body: z.string().optional().describe('Body text of the inbox item'),
  link: z.string().optional().describe('URL to the related content'),
  isUnread: z.boolean().optional().describe('Whether the item is unread'),
  creationDate: z.string().optional().describe('When the item was created (ISO 8601)'),
  site: z.string().optional().describe('Stack Exchange site the item is from')
});

export let getInbox = SlateTool.create(spec, {
  name: 'Get Inbox',
  key: 'get_inbox',
  description: `Retrieve the authenticated user's global inbox or unread inbox items. Requires OAuth with **read_inbox** scope. Shows notifications about new answers, comments, and other activity across the Stack Exchange network.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      unreadOnly: z.boolean().optional().default(false).describe('Only return unread items'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      items: z.array(inboxItemSchema).describe('Inbox items'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      key: ctx.auth.key,
      site: ctx.config.site
    });

    let result: any;
    if (ctx.input.unreadOnly) {
      result = await client.getInboxUnread({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.getInbox({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    }

    let items = result.items.map((item: any) => ({
      itemType: item.item_type,
      title: item.title,
      body: item.body,
      link: item.link,
      isUnread: item.is_unread,
      creationDate: item.creation_date
        ? new Date(item.creation_date * 1000).toISOString()
        : undefined,
      site: item.site?.name
    }));

    return {
      output: { items, hasMore: result.hasMore },
      message: `Retrieved **${items.length}** inbox item(s)${ctx.input.unreadOnly ? ' (unread only)' : ''}.`
    };
  })
  .build();
