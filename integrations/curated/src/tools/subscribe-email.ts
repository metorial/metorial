import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscribeEmail = SlateTool.create(spec, {
  name: 'Subscribe Email',
  key: 'subscribe_email',
  description: `Subscribe an email address to a publication. By default, the subscriber will receive a welcome email and double opt-in settings will be respected. Use the sync option to bypass double opt-in when syncing from another service where the subscriber has already opted in.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      email: z.string().describe('Email address to subscribe'),
      sync: z
        .boolean()
        .optional()
        .describe(
          'Set to true to bypass double opt-in (useful when syncing from another service)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the subscription was successful'),
      errorMessage: z.string().optional().describe('Error message if subscription failed'),
      errors: z.array(z.string()).optional().describe('Detailed error reasons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.subscribe(ctx.input.publicationId, {
      email: ctx.input.email,
      sync: ctx.input.sync
    });

    return {
      output: {
        success: response.success,
        errorMessage: response.error_message,
        errors: response.errors
      },
      message: response.success
        ? `Successfully subscribed **${ctx.input.email}**.`
        : `Failed to subscribe ${ctx.input.email}: ${response.error_message || 'Unknown error'}`
    };
  })
  .build();
