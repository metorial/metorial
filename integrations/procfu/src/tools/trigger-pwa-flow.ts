import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let triggerPwaFlow = SlateTool.create(spec, {
  name: 'Trigger PWA Flow',
  key: 'trigger_pwa_flow',
  description: `Trigger a manual Podio Workflow Automation (PWA/GlobiFlow) flow on a specific Podio item.
Requires the flow ID, item ID, and the webhook c/p values found in your app's webhook configuration.`,
  instructions: ["The c and p values can be found in your Podio app's webhook settings."],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('The PWA/GlobiFlow flow ID to trigger'),
      podioItemId: z.string().describe('The Podio item ID to run the flow on'),
      webhookC: z
        .string()
        .describe('The webhook "c" value from your app\'s webhook configuration'),
      webhookP: z
        .string()
        .describe('The webhook "p" value from your app\'s webhook configuration')
    })
  )
  .output(
    z.object({
      result: z.any().describe('The flow trigger response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let result = await client.triggerFlow(
      ctx.input.flowId,
      ctx.input.podioItemId,
      ctx.input.webhookC,
      ctx.input.webhookP
    );

    return {
      output: { result },
      message: `Triggered flow **${ctx.input.flowId}** on item **${ctx.input.podioItemId}**.`
    };
  })
  .build();
