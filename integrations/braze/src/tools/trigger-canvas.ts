import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError } from '../lib/errors';
import { spec } from '../spec';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

export let triggerCanvas = SlateTool.create(spec, {
  name: 'Trigger Canvas',
  key: 'trigger_canvas',
  description: `Trigger an API-triggered Canvas (multi-step journey) in Braze. Sends users into a Canvas flow with optional entry properties. The Canvas must be configured for API-triggered delivery in the Braze dashboard.`,
  instructions: [
    'The Canvas must be set up as an API-triggered Canvas in the Braze dashboard.',
    'Either specify recipients or set broadcast to true.'
  ],
  constraints: [
    'Maximum 50 recipients per request.',
    'Broadcast sends are rate limited to 250 requests per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      canvasId: z.string().describe('ID of the API-triggered Canvas to trigger'),
      recipients: z
        .array(
          z.object({
            externalUserId: z
              .string()
              .optional()
              .describe('External user ID of the recipient'),
            userAlias: userAliasSchema.optional().describe('User alias of the recipient'),
            canvasEntryProperties: z
              .record(z.string(), z.any())
              .optional()
              .describe('Personalization properties for this recipient at Canvas entry'),
            sendToExistingOnly: z
              .boolean()
              .optional()
              .describe('If true, only send to existing users (defaults to true)')
          })
        )
        .optional()
        .describe('List of recipients to enter into the Canvas'),
      broadcast: z
        .boolean()
        .optional()
        .describe('Set to true to send to all users in the Canvas audience'),
      canvasEntryProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Global Canvas entry properties applied to all recipients')
    })
  )
  .output(
    z.object({
      dispatchId: z.string().optional().describe('Dispatch ID for tracking'),
      message: z.string().describe('Response status from Braze'),
      errors: z.array(z.any()).optional().describe('Errors encountered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.broadcast && (ctx.input.recipients?.length ?? 0) > 0) {
      throw brazeServiceError('broadcast cannot be used with recipients.');
    }

    if (!ctx.input.broadcast && (ctx.input.recipients?.length ?? 0) === 0) {
      throw brazeServiceError('Provide recipients or set broadcast to true.');
    }

    for (let [index, recipient] of (ctx.input.recipients ?? []).entries()) {
      if (!recipient.externalUserId && !recipient.userAlias) {
        throw brazeServiceError(
          `recipients[${index}] must include externalUserId or userAlias.`
        );
      }
    }

    let result = await client.triggerCanvasSend({
      canvasId: ctx.input.canvasId,
      recipients: ctx.input.recipients,
      broadcast: ctx.input.broadcast,
      canvasEntryProperties: ctx.input.canvasEntryProperties
    });

    let targetDesc = ctx.input.broadcast
      ? 'broadcast'
      : `${ctx.input.recipients?.length ?? 0} recipient(s)`;

    return {
      output: {
        dispatchId: result.dispatch_id,
        message: result.message,
        errors: result.errors
      },
      message: `Triggered Canvas **${ctx.input.canvasId}** for ${targetDesc}.`
    };
  })
  .build();
