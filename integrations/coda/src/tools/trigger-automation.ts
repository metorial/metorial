import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerAutomationTool = SlateTool.create(spec, {
  name: 'Trigger Automation',
  key: 'trigger_automation',
  description: `Trigger a webhook-invoked automation rule in a Coda doc by sending a JSON payload. The payload is accessible within the automation as "Step 1 Result". The automation must be pre-configured with a "Webhook invoked" trigger in the doc.`,
  instructions: [
    'The **ruleId** can be found in the Coda doc by enabling Developer Mode (Account Settings > Labs) and clicking the three-dots menu on the automation rule.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc containing the automation'),
      ruleId: z.string().describe('ID of the automation rule to trigger'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON payload to send to the automation, accessible as Step 1 Result')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous automation trigger status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.triggerAutomation(
      ctx.input.docId,
      ctx.input.ruleId,
      ctx.input.payload || {}
    );

    return {
      output: {
        requestId: result.requestId
      },
      message: `Triggered automation rule **${ctx.input.ruleId}** in doc **${ctx.input.docId}**.`
    };
  })
  .build();
