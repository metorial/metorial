import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscribeNewsletter = SlateTool.create(spec, {
  name: 'Subscribe to Newsletter',
  key: 'subscribe_newsletter',
  description: `Subscribe an email address to the publication's newsletter. Subscribers receive email notifications when new posts are published.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to subscribe')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .nullable()
        .optional()
        .describe('Subscription status returned by Hashnode')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let result = await client.subscribeToNewsletter(ctx.input.email);

    return {
      output: {
        status: result?.status
      },
      message: `Subscribed **${ctx.input.email}** to the newsletter`
    };
  })
  .build();
