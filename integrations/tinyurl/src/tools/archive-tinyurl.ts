import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveTinyUrl = SlateTool.create(spec, {
  name: 'Archive TinyURL',
  key: 'archive_tinyurl',
  description: `Toggle the archive status of a TinyURL. Archiving a link removes it from the active list, and calling this again on an archived link unarchives it.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .default('tinyurl.com')
        .describe('Domain of the TinyURL (defaults to tinyurl.com)'),
      alias: z.string().describe('Alias of the TinyURL to archive or unarchive')
    })
  )
  .output(
    z.object({
      tinyUrl: z.string().describe('The shortened URL'),
      domain: z.string().describe('Domain of the TinyURL'),
      alias: z.string().describe('Alias of the TinyURL'),
      url: z.string().describe('The destination URL'),
      archived: z.boolean().describe('Current archive status after toggling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.archiveTinyUrl(ctx.input.domain, ctx.input.alias);

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url,
        archived: result.archived
      },
      message: `TinyURL **${result.tiny_url}** is now ${result.archived ? 'archived' : 'unarchived'}`
    };
  })
  .build();
