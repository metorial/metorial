import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { missingRequiredFieldError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let bookmarkSchema = z.object({
  bookmarkId: z.string().describe('Bookmark ID'),
  channelId: z.string().optional().describe('Channel ID'),
  title: z.string().optional().describe('Bookmark title'),
  link: z.string().optional().describe('Bookmark URL'),
  emoji: z.string().optional().describe('Bookmark emoji'),
  type: z.string().optional().describe('Bookmark type'),
  dateCreated: z.number().optional().describe('Unix timestamp when created')
});

export let manageBookmarks = SlateTool.create(spec, {
  name: 'Manage Bookmarks',
  key: 'manage_bookmarks',
  description: `Add, edit, remove, or list bookmarks (saved links) in a Slack channel. Bookmarks appear at the top of a channel for quick access.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.bookmarks)
  .input(
    z.object({
      action: z.enum(['add', 'edit', 'remove', 'list']).describe('Bookmark action to perform'),
      channelId: z.string().describe('Channel ID'),
      bookmarkId: z.string().optional().describe('Bookmark ID (for edit/remove actions)'),
      title: z.string().optional().describe('Bookmark title (required for add)'),
      link: z.string().optional().describe('Bookmark URL (required for add with type "link")'),
      emoji: z.string().optional().describe('Emoji to display with the bookmark'),
      type: z.string().optional().describe('Bookmark type, usually "link" (required for add)')
    })
  )
  .output(
    z.object({
      bookmark: bookmarkSchema.optional().describe('Bookmark details (for add/edit actions)'),
      bookmarks: z
        .array(bookmarkSchema)
        .optional()
        .describe('List of bookmarks (for list action)'),
      removed: z.boolean().optional().describe('Whether the bookmark was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let { action, channelId } = ctx.input;

    let mapBookmark = (b: any) => ({
      bookmarkId: b.id,
      channelId: b.channel_id,
      title: b.title,
      link: b.link,
      emoji: b.emoji ?? undefined,
      type: b.type,
      dateCreated: b.date_created
    });

    if (action === 'add') {
      if (!ctx.input.title) throw missingRequiredFieldError('title', 'add action');
      let bookmark = await client.addBookmark({
        channelId,
        title: ctx.input.title,
        type: ctx.input.type || 'link',
        link: ctx.input.link,
        emoji: ctx.input.emoji
      });
      return {
        output: { bookmark: mapBookmark(bookmark) },
        message: `Added bookmark **${ctx.input.title}** to channel \`${channelId}\`.`
      };
    }

    if (action === 'edit') {
      if (!ctx.input.bookmarkId) throw missingRequiredFieldError('bookmarkId', 'edit action');
      let bookmark = await client.editBookmark({
        channelId,
        bookmarkId: ctx.input.bookmarkId,
        title: ctx.input.title,
        link: ctx.input.link,
        emoji: ctx.input.emoji
      });
      return {
        output: { bookmark: mapBookmark(bookmark) },
        message: `Updated bookmark \`${ctx.input.bookmarkId}\`.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.bookmarkId) {
        throw missingRequiredFieldError('bookmarkId', 'remove action');
      }
      await client.removeBookmark(channelId, ctx.input.bookmarkId);
      return {
        output: { removed: true },
        message: `Removed bookmark \`${ctx.input.bookmarkId}\` from channel \`${channelId}\`.`
      };
    }

    // list
    let bookmarks = await client.listBookmarks(channelId);
    return {
      output: { bookmarks: bookmarks.map(mapBookmark) },
      message: `Found ${bookmarks.length} bookmark(s) in channel \`${channelId}\`.`
    };
  })
  .build();
