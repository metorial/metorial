import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let startAutomation = SlateTool.create(spec, {
  name: 'Start Automation',
  key: 'start_automation',
  description: `Start an automation for a contact in Simplero, or list all available automations. The contact will be created if they don't already exist.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'start']).describe('Action to perform'),
      automationId: z.string().optional().describe('Automation ID (required for start)'),
      email: z
        .string()
        .optional()
        .describe('Contact email to start the automation for (required for start)'),
      page: z.number().optional().describe('Page number for listing automations (0-indexed)')
    })
  )
  .output(
    z.object({
      automations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of available automations'),
      success: z.boolean().optional().describe('Whether the automation was started')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    if (ctx.input.action === 'list') {
      let automations = await client.listAutomations({ page: ctx.input.page });
      return {
        output: { automations },
        message: `Found **${automations.length}** automation(s).`
      };
    }

    if (!ctx.input.automationId) throw new Error('automationId is required.');
    if (!ctx.input.email) throw new Error('email is required.');

    let result = await client.startAutomation(ctx.input.automationId, ctx.input.email);
    return {
      output: { success: result.success as boolean },
      message: `Automation **${ctx.input.automationId}** started for **${ctx.input.email}**.`
    };
  })
  .build();
