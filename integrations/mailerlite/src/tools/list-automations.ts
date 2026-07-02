import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `Retrieves automations in the account, optionally filtered by enabled status, name, or group. Can also fetch a specific automation's details or subscriber activity within an automation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z
        .string()
        .optional()
        .describe('Automation ID — if provided, returns details for this automation'),
      enabled: z
        .boolean()
        .optional()
        .describe('Filter by enabled/disabled status (for listing)'),
      name: z.string().optional().describe('Filter by automation name (for listing)'),
      group: z.string().optional().describe('Filter by group ID (for listing)'),
      includeActivity: z
        .boolean()
        .optional()
        .describe('Whether to include subscriber activity (when automationId is provided)'),
      activityStatus: z
        .enum(['completed', 'active', 'canceled', 'failed'])
        .optional()
        .describe('Filter activity by status'),
      limit: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      automations: z
        .array(
          z.object({
            automationId: z.string().describe('Automation ID'),
            name: z.string().describe('Automation name'),
            enabled: z.boolean().optional().describe('Whether the automation is active'),
            triggerType: z.string().optional().describe('Trigger type'),
            stats: z.any().optional().describe('Automation statistics'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of automations (when no automationId provided)'),
      automation: z
        .object({
          automationId: z.string().describe('Automation ID'),
          name: z.string().describe('Automation name'),
          enabled: z.boolean().optional().describe('Whether the automation is active'),
          steps: z.array(z.any()).optional().describe('Automation steps'),
          triggers: z.array(z.any()).optional().describe('Automation triggers'),
          stats: z.any().optional().describe('Automation statistics')
        })
        .optional()
        .describe('Automation details (when automationId provided)'),
      activities: z
        .array(z.any())
        .optional()
        .describe('Subscriber activities within the automation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.automationId) {
      let result = await client.getAutomation(ctx.input.automationId);
      let a = result.data;

      let activities: any[] | undefined;
      if (ctx.input.includeActivity) {
        let activityResult = await client.getAutomationSubscriberActivity(
          ctx.input.automationId,
          {
            status: ctx.input.activityStatus,
            limit: ctx.input.limit,
            page: ctx.input.page
          }
        );
        activities = activityResult.data || [];
      }

      return {
        output: {
          automation: {
            automationId: a.id,
            name: a.name,
            enabled: a.enabled,
            steps: a.steps,
            triggers: a.triggers,
            stats: a.stats
          },
          activities
        },
        message: `Retrieved automation **${a.name}**${activities ? ` with **${activities.length}** activity records` : ''}.`
      };
    }

    let result = await client.listAutomations({
      enabled: ctx.input.enabled,
      name: ctx.input.name,
      group: ctx.input.group,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let automations = (result.data || []).map((a: any) => ({
      automationId: a.id,
      name: a.name,
      enabled: a.enabled,
      triggerType: a.trigger_type,
      stats: a.stats,
      createdAt: a.created_at
    }));

    return {
      output: { automations },
      message: `Retrieved **${automations.length}** automations.`
    };
  })
  .build();
