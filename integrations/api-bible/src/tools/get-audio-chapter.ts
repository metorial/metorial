import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookSchema = z.object({
  bookId: z.string().describe('Book identifier'),
  bibleId: z.string().describe('Audio Bible ID'),
  abbreviation: z.string().describe('Book abbreviation'),
  name: z.string().describe('Book name'),
  nameLong: z.string().describe('Full book name')
});

let chapterSummarySchema = z.object({
  chapterId: z.string().describe('Chapter identifier'),
  bibleId: z.string().describe('Audio Bible ID'),
  bookId: z.string().describe('Book ID'),
  number: z.string().describe('Chapter number'),
  reference: z.string().describe('Human-readable reference')
});

export let getAudioChapter = SlateTool.create(spec, {
  name: 'Get Audio Chapter',
  key: 'get_audio_chapter',
  description: `Retrieve audio Bible content. Can list books in an audio Bible, list chapters for a book, or get the audio resource URL for a specific chapter. The audio file is available to download; its signed resource URL expires.`,
  instructions: [
    'Provide audioBibleId alone to list available books. Add bookId to list chapters. Add chapterId to get the audio URL.',
    'Use the List Audio Bibles tool first to find available audio Bible IDs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audioBibleId: z.string().describe('The audio Bible version ID'),
      bookId: z.string().optional().describe('Book ID to list chapters for that book'),
      chapterId: z.string().optional().describe('Chapter ID to get audio resource URL')
    })
  )
  .output(
    z.object({
      books: z.array(bookSchema).optional().describe('List of books (when listing books)'),
      chapters: z
        .array(chapterSummarySchema)
        .optional()
        .describe('List of chapters (when listing chapters)'),
      chapterId: z.string().optional().describe('Chapter ID (when retrieving audio)'),
      reference: z.string().optional().describe('Human-readable reference'),
      resourceUrl: z
        .string()
        .optional()
        .describe('Original signed URL to the audio resource file'),
      expiresAt: z.number().optional().describe('Original provider expiry timestamp'),
      timecodes: z
        .array(z.object({ start: z.string(), end: z.string(), verseId: z.string() }))
        .optional()
        .describe('Verse timing information when supplied'),
      fumsToken: z.string().optional().describe('Current FUMS token for listening engagement'),
      meta: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original scripture response metadata'),
      copyright: z.string().optional().describe('Copyright information'),
      fumsId: z.string().optional().describe('FUMS tracking token'),
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
      let result = await client.getAudioChapter(ctx.input.audioBibleId, ctx.input.chapterId);
      let ch = result.data;
      if (!ch.resourceUrl) {
        throw createApiServiceError('API.Bible did not return an audio download URL.');
      }
      await ctx.addAttachment({
        type: 'url',
        url: ch.resourceUrl,
        mimeType: 'audio/mpeg',
        refreshReference: { audioBibleId: ctx.input.audioBibleId, chapterId: ch.id },
        // Request a fresh signed URL on every download instead of guessing its lifetime.
        refreshAt: new Date().toISOString()
      });
      return {
        output: {
          chapterId: ch.id,
          reference: ch.reference,
          resourceUrl: ch.resourceUrl,
          expiresAt: ch.expiresAt,
          timecodes: ch.timecodes,
          fumsToken: result.meta?.fumsToken,
          meta: result.meta,
          copyright: ch.copyright,
          fumsId: result.meta?.fumsId,
          nextChapterId: ch.next?.id ?? null,
          previousChapterId: ch.previous?.id ?? null
        },
        message: `Prepared audio for chapter **${ch.reference}** for download.`
      };
    }

    if (ctx.input.bookId) {
      let result = await client.getAudioBibleChapters(
        ctx.input.audioBibleId,
        ctx.input.bookId
      );
      let chapters = result.data.map(ch => ({
        chapterId: ch.id,
        bibleId: ch.bibleId,
        bookId: ch.bookId,
        number: ch.number,
        reference: ch.reference
      }));
      return {
        output: { chapters },
        message: `Found **${chapters.length}** chapter(s) in book ${ctx.input.bookId}.`
      };
    }

    let result = await client.getAudioBibleBooks(ctx.input.audioBibleId);
    let books = result.data.map(b => ({
      bookId: b.id,
      bibleId: b.bibleId,
      abbreviation: b.abbreviation,
      name: b.name,
      nameLong: b.nameLong
    }));
    return {
      output: { books },
      message: `Found **${books.length}** book(s) in audio Bible.`
    };
  })
  .build();
