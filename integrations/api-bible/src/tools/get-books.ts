import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookSchema = z.object({
  bookId: z.string().describe('Unique identifier for the book (e.g., "GEN", "MAT")'),
  bibleId: z.string().describe('Bible version this book belongs to'),
  abbreviation: z.string().describe('Book abbreviation'),
  name: z.string().describe('Book name'),
  nameLong: z.string().describe('Full book name')
});

export let getBooks = SlateTool.create(spec, {
  name: 'Get Books',
  key: 'get_books',
  description: `List all books in a Bible version, or retrieve details for a specific book. Returns book names, abbreviations, and IDs that can be used to navigate chapters and verses.`,
  instructions: [
    'Common book IDs include: GEN (Genesis), EXO (Exodus), MAT (Matthew), MRK (Mark), LUK (Luke), JHN (John), ACT (Acts), ROM (Romans), REV (Revelation).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bibleId: z.string().describe('The Bible version ID to list books from'),
      bookId: z
        .string()
        .optional()
        .describe(
          'Specific book ID to retrieve details for. If omitted, all books are returned.'
        )
    })
  )
  .output(
    z.object({
      books: z.array(bookSchema).describe('List of books'),
      totalCount: z.number().describe('Number of books returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.bookId) {
      let result = await client.getBook(ctx.input.bibleId, ctx.input.bookId);
      let b = result.data;
      return {
        output: {
          books: [
            {
              bookId: b.bookId,
              bibleId: b.bibleId,
              abbreviation: b.abbreviation || '',
              name: b.name || '',
              nameLong: b.nameLong || ''
            }
          ],
          totalCount: 1
        },
        message: `Retrieved book: **${b.name}** (${b.bookId})`
      };
    }

    let result = await client.getBooks(ctx.input.bibleId);
    let books = (result.data || []).map(b => ({
      bookId: b.bookId,
      bibleId: b.bibleId,
      abbreviation: b.abbreviation || '',
      name: b.name || '',
      nameLong: b.nameLong || ''
    }));

    return {
      output: {
        books,
        totalCount: books.length
      },
      message: `Found **${books.length}** book(s) in the Bible version.`
    };
  })
  .build();
