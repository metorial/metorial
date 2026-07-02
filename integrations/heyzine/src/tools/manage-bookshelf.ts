import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeyzineClient } from '../lib/client';
import { spec } from '../spec';

export let manageBookshelf = SlateTool.create(spec, {
  name: 'Manage Bookshelf',
  key: 'manage_bookshelf',
  description: `Lists bookshelves, lists flipbooks within a bookshelf, or adds/removes flipbooks from a bookshelf.
Bookshelves are collections of flipbooks displayed on a shared page.`,
  instructions: [
    'Use action "list_bookshelves" to get all bookshelves.',
    'Use action "list_flipbooks" to see flipbooks in a specific bookshelf.',
    'Use action "add_flipbook" or "remove_flipbook" to manage bookshelf contents.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list_bookshelves', 'list_flipbooks', 'add_flipbook', 'remove_flipbook'])
        .describe('Action to perform on bookshelves.'),
      bookshelfId: z
        .string()
        .optional()
        .describe('Bookshelf identifier. Required for all actions except "list_bookshelves".'),
      flipbookId: z
        .string()
        .optional()
        .describe(
          'Flipbook identifier. Required for "add_flipbook" and "remove_flipbook" actions.'
        ),
      position: z
        .number()
        .optional()
        .describe(
          'Position to insert the flipbook at in the bookshelf. Only used with "add_flipbook".'
        )
    })
  )
  .output(
    z.object({
      bookshelves: z
        .array(
          z.object({
            bookshelfId: z.string().describe('Unique identifier of the bookshelf.'),
            title: z.string().describe('Title of the bookshelf.'),
            url: z.string().describe('URL of the bookshelf.')
          })
        )
        .optional()
        .describe('List of bookshelves (only for "list_bookshelves" action).'),
      flipbooks: z
        .array(
          z.object({
            flipbookId: z.string().describe('Unique identifier of the flipbook.'),
            title: z.string().describe('Title of the flipbook.'),
            url: z.string().describe('URL of the flipbook.'),
            thumbnailUrl: z.string().describe('URL of the flipbook thumbnail.')
          })
        )
        .optional()
        .describe('List of flipbooks in the bookshelf (only for "list_flipbooks" action).'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the add/remove operation was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeyzineClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId
    });

    if (ctx.input.action === 'list_bookshelves') {
      let bookshelves = await client.listBookshelves();
      let mapped = (Array.isArray(bookshelves) ? bookshelves : []).map(bs => ({
        bookshelfId: bs.id,
        title: bs.title || '',
        url: bs.url || ''
      }));

      return {
        output: { bookshelves: mapped },
        message: `Found **${mapped.length}** bookshelf(ves).`
      };
    }

    if (ctx.input.action === 'list_flipbooks') {
      if (!ctx.input.bookshelfId)
        throw new Error('bookshelfId is required for list_flipbooks action.');

      let flipbooks = await client.listBookshelfFlipbooks(ctx.input.bookshelfId);
      let mapped = (Array.isArray(flipbooks) ? flipbooks : []).map(fb => ({
        flipbookId: fb.id,
        title: fb.title || '',
        url: fb.url || '',
        thumbnailUrl: fb.thumbnail || ''
      }));

      return {
        output: { flipbooks: mapped },
        message: `Found **${mapped.length}** flipbook(s) in bookshelf **${ctx.input.bookshelfId}**.`
      };
    }

    if (ctx.input.action === 'add_flipbook') {
      if (!ctx.input.bookshelfId)
        throw new Error('bookshelfId is required for add_flipbook action.');
      if (!ctx.input.flipbookId)
        throw new Error('flipbookId is required for add_flipbook action.');

      await client.addFlipbookToBookshelf(
        ctx.input.bookshelfId,
        ctx.input.flipbookId,
        ctx.input.position
      );

      return {
        output: { success: true },
        message: `Added flipbook **${ctx.input.flipbookId}** to bookshelf **${ctx.input.bookshelfId}**.`
      };
    }

    if (ctx.input.action === 'remove_flipbook') {
      if (!ctx.input.bookshelfId)
        throw new Error('bookshelfId is required for remove_flipbook action.');
      if (!ctx.input.flipbookId)
        throw new Error('flipbookId is required for remove_flipbook action.');

      await client.removeFlipbookFromBookshelf(ctx.input.bookshelfId, ctx.input.flipbookId);

      return {
        output: { success: true },
        message: `Removed flipbook **${ctx.input.flipbookId}** from bookshelf **${ctx.input.bookshelfId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
