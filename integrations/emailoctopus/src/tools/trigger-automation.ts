import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerAutomation = SlateTool.create(spec, {
  name: 'Trigger Automation',
  key: 'trigger_automation',
  description: `Start an automation sequence for a specific contact. This can send emails, change fields or tags and retain execution history. The automation must be configured with a "Started via API" trigger type in the EmailOctopus dashboard.`,
  instructions: [
    'A contact can only trigger an automation once unless "Allow contacts to repeat" is enabled on the automation.'
  ],
  tags: {
    readOnly: false,
    destructive: true
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
      triggered: z
        .boolean()
        .describe(
          'Whether the API accepted the automation request; execution completion is not confirmed'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.triggerAutomation(ctx.input.automationId, ctx.input.contactId);

    return {
      output: { triggered: true },
      message: `Accepted automation request \`${client.safeText(ctx.input.automationId)}\` for contact \`${client.safeText(ctx.input.contactId)}\`.`
    };
  })
  .build();
