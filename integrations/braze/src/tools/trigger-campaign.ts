import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError } from '../lib/errors';
import { spec } from '../spec';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

export let triggerCampaign = SlateTool.create(spec, {
  name: 'Trigger Campaign',
  key: 'trigger_campaign',
  description: `Trigger an API-triggered campaign in Braze. Sends the campaign to specified recipients with optional personalization via trigger properties and user attributes. The campaign must be configured for API-triggered delivery in the Braze dashboard.`,
  instructions: [
    'The campaign must be set up as an API-triggered campaign in the Braze dashboard.',
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
      campaignId: z.string().describe('ID of the API-triggered campaign to send'),
      recipients: z
        .array(
          z.object({
            externalUserId: z
              .string()
              .optional()
              .describe('External user ID of the recipient'),
            userAlias: userAliasSchema.optional().describe('User alias of the recipient'),
            triggerProperties: z
              .record(z.string(), z.any())
              .optional()
              .describe(
                'Personalization key-value pairs for this recipient, accessible in the message template'
              ),
            sendToExistingOnly: z
              .boolean()
              .optional()
              .describe('If true, only send to existing users (defaults to true)'),
            attributes: z
              .record(z.string(), z.any())
              .optional()
              .describe('User attributes to update before sending')
          })
        )
        .optional()
        .describe('List of recipients for targeted delivery'),
      broadcast: z
        .boolean()
        .optional()
        .describe('Set to true to send to all users in the campaign segment'),
      triggerProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Global trigger properties applied to all recipients')
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

    let result = await client.triggerCampaignSend({
      campaignId: ctx.input.campaignId,
      recipients: ctx.input.recipients,
      broadcast: ctx.input.broadcast,
      triggerProperties: ctx.input.triggerProperties
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
      message: `Triggered campaign **${ctx.input.campaignId}** to ${targetDesc}.`
    };
  })
  .build();
