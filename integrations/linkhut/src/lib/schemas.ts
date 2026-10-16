import { z } from 'zod';

export let bookmarkSchema = z.object({
  href: z.string().describe('URL of the bookmark'),
  description: z.string().describe('Title of the bookmark'),
  extended: z.string().describe('Extended notes'),
  hash: z.string().describe('MD5 hash of the URL'),
  tag: z.string().describe('Space-separated tags'),
  time: z.string().describe('ISO 8601 timestamp of when the bookmark was created'),
  shared: z.string().describe('Whether the bookmark is public ("yes" or "no")'),
  toread: z.string().describe('Whether the bookmark is marked as unread ("yes" or "no")'),
  meta: z.string().nullable().optional().describe('Change signature; null when not requested')
});
