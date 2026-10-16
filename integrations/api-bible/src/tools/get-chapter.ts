import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scriptureContent } from '../lib/content';
import { spec } from '../spec';

let chapterSummarySchema = z.object({
  chapterId: z.string().describe('Unique chapter identifier (e.g., "GEN.1")'),
  bibleId: z.string().describe('Bible version ID'),
  bookId: z.string().describe('Book ID'),
  number: z.string().describe('Chapter number'),
  reference: z.string().describe('Human-readable chapter reference')
});

export let getChapter = SlateTool.create(spec, {
  name: 'Get Chapter',
  key: 'get_chapter',
  description: `Retrieve chapter content or list chapters in a book. When a chapter ID is provided, returns the full scripture text in HTML format along with verse count, copyright, and navigation links. When only a book ID is provided, lists all chapters in that book.`,
  instructions: [
    'Chapter IDs follow the format "BOOK.CHAPTER", e.g., "GEN.1" for Genesis chapter 1, "MAT.5" for Matthew chapter 5.',
    'The content is returned in HTML format by default. Use contentType to change to "text" or "json".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID'),
      bookId: z
        .string()
        .optional()
        .describe('Book ID to list all chapters for that book (e.g., "GEN")'),
      chapterId: z
        .string()
        .optional()
        .describe('Specific chapter ID to retrieve content (e.g., "GEN.1")'),
      parallels: z
        .string()
        .optional()
        .describe('Comma-separated Bible IDs to return parallel scripture from'),
      contentType: z
        .enum(['html', 'json', 'text'])
        .optional()
        .describe('Content format. Defaults to HTML.'),
      includeNotes: z.boolean().optional().describe('Include footnotes in the content'),
      includeTitles: z.boolean().optional().describe('Include section titles in the content'),
      includeChapterNumbers: z
        .boolean()
        .optional()
        .describe('Include chapter numbers in the content'),
      includeVerseNumbers: z
        .boolean()
        .optional()
        .describe('Include verse numbers in the content'),
      includeVerseSpans: z.boolean().optional().describe('Include verse spans in the content')
    })
  )
  .output(
    z.object({
      chapters: z
        .array(chapterSummarySchema)
        .optional()
        .describe('List of chapters (when listing)'),
      chapterId: z.string().optional().describe('Chapter ID (when retrieving content)'),
      reference: z.string().optional().describe('Human-readable reference'),
      content: z.string().optional().describe('Chapter scripture content'),
      verseCount: z.number().optional().describe('Number of verses in the chapter'),
      copyright: z.string().optional().describe('Copyright information'),
      fumsToken: z.string().optional().describe('Current FUMS token for scripture engagement'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original scripture response metadata'),
      fumsId: z
        .string()
        .optional()
        .describe('FUMS tracking token for reporting scripture engagement'),
      nextChapterId: z.string().optional().nullable().describe('ID of the next chapter'),
      previousChapterId: z
        .string()
        .optional()
        .nullable()
        .describe('ID of the previous chapter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.chapterId) {
      let result = await client.getChapter(ctx.input.bibleId, ctx.input.chapterId, {
        contentType: ctx.input.contentType,
        parallels: ctx.input.parallels,
        includeNotes: ctx.input.includeNotes,
        includeTitles: ctx.input.includeTitles,
        includeChapterNumbers: ctx.input.includeChapterNumbers,
        includeVerseNumbers: ctx.input.includeVerseNumbers,
        includeVerseSpans: ctx.input.includeVerseSpans
      });
      let ch = result.data;
      return {
        output: {
          chapterId: ch.id,
          reference: ch.reference,
          content: scriptureContent(ch.content),
          verseCount: ch.verseCount,
          copyright: ch.copyright,
          fumsToken: result.meta?.fumsToken,
          meta: result.meta,
          fumsId: result.meta?.fumsId,
          nextChapterId: ch.next?.id ?? null,
          previousChapterId: ch.previous?.id ?? null
        },
        message: `Retrieved chapter **${ch.reference}** with ${ch.verseCount} verse(s).`
      };
    }

    if (ctx.input.bookId) {
      let result = await client.getChapters(ctx.input.bibleId, ctx.input.bookId);
      let chapters = result.data.map(ch => ({
        chapterId: ch.id,
        bibleId: ch.bibleId,
        bookId: ch.bookId,
        number: ch.number,
        reference: ch.reference
      }));

      return {
        output: {
          chapters
        },
        message: `Found **${chapters.length}** chapter(s) in book ${ctx.input.bookId}.`
      };
    }

    throw createApiServiceError(
      'Either bookId (to list chapters) or chapterId (to retrieve content) must be provided.'
    );
  })
  .build();
