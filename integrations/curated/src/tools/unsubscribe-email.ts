import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let unsubscribeEmail = SlateTool.create(spec, {
  name: 'Unsubscribe Email',
  key: 'unsubscribe_email',
  description: `Unsubscribe an email address from a publication. The email will be added to the unsubscriber list and will no longer receive newsletters. Call list_publications to discover the publication ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      email: z.string().describe('Email address to unsubscribe')
    })
  )
  .output(
    z.object({
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata'),
      success: z.boolean().describe('Whether the unsubscription was successful'),
      errorMessage: z.string().optional().describe('Error message if unsubscription failed'),
      errors: z.array(z.string()).optional().describe('Detailed error reasons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.unsubscribe(ctx.input.publicationId, {
      email: ctx.input.email
    });

    return {
      output: {
        raw: response,
        success: response.success,
        errorMessage: response.error_message ?? undefined,
        errors: response.errors ?? undefined
      },
      message: response.success
        ? `Successfully unsubscribed **${ctx.input.email}**.`
        : `Failed to unsubscribe ${ctx.input.email}: ${response.error_message || 'Unknown error'}`
    };
  })
  .build();
