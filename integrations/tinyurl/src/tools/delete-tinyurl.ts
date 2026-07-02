import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTinyUrl = SlateTool.create(spec, {
  name: 'Delete TinyURL',
  key: 'delete_tinyurl',
  description: `Permanently delete an existing TinyURL. This action cannot be undone and the short link will stop working.`,
  constraints: [
    'This action is irreversible. The alias will no longer redirect to the destination URL.'
  ],
  tags: {
    destructive: true,
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
      alias: z.string().describe('Alias of the TinyURL to delete')
    })
  )
  .output(
    z.object({
      tinyUrl: z.string().describe('The deleted shortened URL'),
      domain: z.string().describe('Domain of the deleted TinyURL'),
      alias: z.string().describe('Alias of the deleted TinyURL'),
      url: z.string().describe('The destination URL that was linked')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteTinyUrl(ctx.input.domain, ctx.input.alias);

    return {
      output: {
        tinyUrl: result.tiny_url,
        domain: result.domain,
        alias: result.alias,
        url: result.url
      },
      message: `Deleted TinyURL **${result.tiny_url}**`
    };
  })
  .build();
