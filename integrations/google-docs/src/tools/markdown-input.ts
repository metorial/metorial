import { createApiServiceError } from 'slates';
import { z } from 'zod';

// Drive multipart uploads cap the whole request body at 5 MiB; reserve 16 KiB
// of headroom for the multipart metadata part and boundaries.
export const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024 - 16 * 1024;

export let markdownInputSchema = z
  .string()
  .min(1)
  .describe(
    `Markdown source to convert into Google Docs content (UTF-8, maximum ${MAX_MARKDOWN_BYTES} bytes — 5 MiB minus 16 KiB of multipart-metadata headroom)`
  );

export let validateMarkdown = (markdown: string) => {
  if (markdown.trim().length === 0) {
    throw createApiServiceError('markdown must contain non-whitespace content.', {
      reason: 'empty_markdown'
    });
  }

  let byteLength = new TextEncoder().encode(markdown).byteLength;
  if (byteLength > MAX_MARKDOWN_BYTES) {
    throw createApiServiceError(
      `markdown must be at most ${MAX_MARKDOWN_BYTES} UTF-8 bytes (5 MiB minus 16 KiB of multipart-metadata headroom) for a Drive multipart upload.`,
      {
        reason: 'markdown_too_large'
      }
    );
  }

  return byteLength;
};
