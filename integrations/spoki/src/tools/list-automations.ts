import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description:
    'Discover Spoki automation IDs and active API startup step UUIDs before using start_automation.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Positive whole-number page to retrieve.')
    })
  )
  .output(
    z.object({
      automations: z.array(
        z.object({
          automationId: z.string().optional(),
          name: z.string().optional(),
          isActive: z.boolean().optional(),
          webhookUuids: z
            .array(z.string())
            .describe(
              'Active API startup step UUIDs. Pass one as webhookUuid when multiple are available.'
            )
        })
      ),
      totalCount: z.number().optional(),
      next: z.string().nullable().optional(),
      previous: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listAutomations(ctx.input);
    let items = Array.isArray(result)
      ? result
      : Array.isArray(result?.results)
        ? result.results
        : [];
    let automations = items.map((automation: any) => ({
      automationId:
        automation.id === undefined || automation.id === null
          ? undefined
          : String(automation.id),
      name: automation.name ?? undefined,
      isActive: automation.is_active ?? undefined,
      webhookUuids: Array.isArray(automation.webhook_set)
        ? automation.webhook_set
            .filter((webhook: any) => webhook.is_active && typeof webhook.uuid === 'string')
            .map((webhook: any) => webhook.uuid)
        : []
    }));
    return {
      output: {
        automations,
        totalCount: result?.count ?? automations.length,
        next: result?.next,
        previous: result?.previous
      },
      message: `Found **${automations.length}** automations`
    };
  })
  .build();
