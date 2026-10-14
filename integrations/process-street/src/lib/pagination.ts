import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let cursorSchema = z
  .string()
  .optional()
  .describe(
    'Pagination cursor from nextCursor in a previous response. Omit for the first page.'
  );

export let nextCursorSchema = z
  .string()
  .optional()
  .describe(
    'Pass this cursor to the same tool with the same filters to retrieve the next page.'
  );

type PageLinks = { links?: Array<{ name: string; href: string }> };

export let getNextCursor = (page: PageLinks) => {
  let next = page.links?.find(link => link.name === 'next');
  if (!next) return undefined;
  let cursor: string | null;
  try {
    cursor = new URL(next.href, 'https://public-api.process.st').searchParams.get('_');
  } catch (error) {
    throw createApiServiceError('Process Street returned an invalid next-page link.', {
      parent: error
    });
  }
  if (!cursor) {
    throw createApiServiceError('Process Street returned a next-page link without a cursor.');
  }
  return cursor;
};
