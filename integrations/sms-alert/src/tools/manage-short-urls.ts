import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let manageShortUrls = SlateTool.create(spec, {
  name: 'Manage Short URLs',
  key: 'manage_short_urls',
  description: `Create or delete shortened URLs. Useful for including trackable links in SMS messages to stay within character limits.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete'])
        .describe('Action to perform: create a new short URL or delete an existing one.'),
      longUrl: z
        .string()
        .optional()
        .describe('The full URL to shorten (required for create).'),
      shortUrlId: z
        .string()
        .optional()
        .describe('ID of the short URL to delete (required for delete).')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z.any().describe('Short URL details or confirmation of deletion.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    let result: any;

    if (ctx.input.action === 'create') {
      if (!ctx.input.longUrl) throw new Error('Long URL is required to create a short URL.');

      ctx.info(`Creating short URL for: ${ctx.input.longUrl}`);
      result = await client.createShortUrl({ longUrl: ctx.input.longUrl });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Short URL created for **${ctx.input.longUrl}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.shortUrlId) throw new Error('Short URL ID is required to delete.');

      ctx.info(`Deleting short URL: ${ctx.input.shortUrlId}`);
      result = await client.deleteShortUrl({ shortUrlId: ctx.input.shortUrlId });
      return {
        output: {
          status: result.status || 'unknown',
          description: result.description || result
        },
        message: `Short URL **${ctx.input.shortUrlId}** deleted`
      };
    }

    throw new Error(`Invalid action: ${ctx.input.action}`);
  })
  .build();
