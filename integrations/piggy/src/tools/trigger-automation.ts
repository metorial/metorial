import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerAutomation = SlateTool.create(spec, {
  name: 'Trigger Automation',
  key: 'trigger_automation',
  description: `Trigger an automation run for a specific contact. Automations are workflows configured in the Piggy dashboard that can send emails, award credits, or perform other actions. Optionally list available automations.`
})
  .input(
    z.object({
      action: z
        .enum(['trigger', 'list'])
        .default('trigger')
        .describe(
          'Action: "trigger" to run an automation, "list" to list available automations'
        ),
      automationUuid: z
        .string()
        .optional()
        .describe('UUID of the automation to trigger (required for trigger)'),
      contactUuid: z
        .string()
        .optional()
        .describe('UUID of the contact for the automation run (required for trigger)'),
      runData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional data to pass to the automation')
    })
  )
  .output(
    z.object({
      automations: z
        .array(
          z
            .object({
              automationUuid: z.string().optional().describe('UUID of the automation'),
              name: z.string().optional().describe('Automation name')
            })
            .passthrough()
        )
        .optional()
        .describe('List of automations (for list action)'),
      triggered: z
        .boolean()
        .optional()
        .describe('Whether the automation was triggered successfully'),
      automationUuid: z.string().optional().describe('UUID of the triggered automation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listAutomations();
      let automations = (result.data || []).map((a: any) => ({
        automationUuid: a.uuid,
        name: a.name,
        ...a
      }));
      return {
        output: { automations },
        message: `Retrieved **${automations.length}** automation(s).`
      };
    }

    if (!ctx.input.automationUuid) throw new Error('automationUuid is required for trigger');
    if (!ctx.input.contactUuid) throw new Error('contactUuid is required for trigger');

    await client.triggerAutomationRun({
      automationUuid: ctx.input.automationUuid,
      contactUuid: ctx.input.contactUuid,
      runData: ctx.input.runData
    });

    return {
      output: {
        triggered: true,
        automationUuid: ctx.input.automationUuid
      },
      message: `Automation **${ctx.input.automationUuid}** triggered for contact ${ctx.input.contactUuid}.`
    };
  })
  .build();
