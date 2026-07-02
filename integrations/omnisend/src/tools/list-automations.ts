import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `List automation workflows configured in Omnisend. Returns details about each automation including name, status, and trigger type.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      automations: z
        .array(
          z.object({
            automationId: z.string().describe('Automation ID'),
            name: z.string().optional().describe('Automation name'),
            status: z.string().optional().describe('Automation status'),
            triggerType: z.string().optional().describe('Trigger type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last updated timestamp')
          })
        )
        .describe('List of automations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);
    let result = await client.listAutomations();

    let automations = (result.automations || []).map((a: any) => ({
      automationId: a.id || a.automationID,
      name: a.name,
      status: a.status,
      triggerType: a.triggerType,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return {
      output: { automations },
      message: `Retrieved **${automations.length}** automations.`
    };
  })
  .build();
