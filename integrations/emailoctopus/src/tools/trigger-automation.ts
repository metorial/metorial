import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerAutomation = SlateTool.create(spec, {
  name: 'Trigger Automation',
  key: 'trigger_automation',
  description: `Start an automation sequence for a specific contact. The automation must be configured with a "Started via API" trigger type in the EmailOctopus dashboard.`,
  instructions: [
    'A contact can only trigger an automation once unless "Allow contacts to repeat" is enabled on the automation.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('ID of the automation to trigger'),
      contactId: z.string().describe('ID of the contact to start the automation for')
    })
  )
  .output(
    z.object({
      triggered: z.boolean().describe('Whether the automation was successfully triggered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.triggerAutomation(ctx.input.automationId, ctx.input.contactId);

    return {
      output: { triggered: true },
      message: `Triggered automation \`${ctx.input.automationId}\` for contact \`${ctx.input.contactId}\`.`
    };
  })
  .build();
