import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateUuid } from '../lib/validation';
import { spec } from '../spec';

export let triggerSkillWebhook = SlateTool.create(spec, {
  name: 'Trigger Skill Webhook',
  key: 'trigger_skill_webhook',
  description:
    'Send a JSON payload to an item skill webhook to start a skill run. Optionally signs the payload with an HMAC-SHA256 signature using the API key as the shared secret.'
})
  .input(
    z.object({
      skillId: z
        .string()
        .uuid()
        .describe('UUID of the item skill with a configured live webhook trigger'),
      payload: z
        .record(z.string(), z.any())
        .describe('JSON object to send as the skill input context'),
      signPayload: z
        .boolean()
        .optional()
        .describe('Whether to include the x-webhook-signature header')
    })
  )
  .output(
    z.object({
      success: z.literal(true).describe('Confirms that item accepted the webhook'),
      skillRunId: z.string().uuid().describe('Created skill run UUID'),
      message: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    validateUuid(ctx.input.skillId, 'skillId');
    let client = new Client({ token: ctx.auth.token });
    let result = await client.triggerSkillWebhook(ctx.input.skillId, ctx.input.payload, {
      signPayload: ctx.input.signPayload
    });

    return {
      output: {
        success: result.success,
        skillRunId: result.skillRunId,
        message: result.message
      },
      message: `Triggered skill webhook **${ctx.input.skillId}**.`
    };
  })
  .build();
