import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let subscribeEmail = SlateTool.create(spec, {
  name: 'Subscribe Email',
  key: 'subscribe_email',
  description: `Subscribe an email address to a publication. By default, the subscriber will receive a welcome email and double opt-in settings will be respected. Use the sync option to bypass double opt-in when syncing from another service where the subscriber has already opted in. Call list_publications to discover the publication ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
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
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
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
        raw: response,
        success: response.success,
        errorMessage: response.error_message ?? undefined,
        errors: response.errors ?? undefined
      },
      message: response.success
        ? `Successfully subscribed **${ctx.input.email}**.`
        : `Failed to subscribe ${ctx.input.email}: ${response.error_message || 'Unknown error'}`
    };
  })
  .build();
