import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listEscalations = SlateTool.create(spec, {
  name: 'List Escalations',
  key: 'list_escalations',
  description: `List all escalation policies in the account. Returns each policy with its rules and repeat configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      escalations: z.array(
        z.object({
          escalationId: z.string().describe('Escalation policy ID'),
          name: z.string().describe('Escalation policy name'),
          description: z.string().optional().describe('Escalation policy description'),
          ownerTeam: z
            .object({
              teamId: z.string().optional().describe('Team ID'),
              name: z.string().optional().describe('Team name')
            })
            .optional()
            .describe('Owning team'),
          rules: z
            .array(
              z.object({
                condition: z.string().describe('Trigger condition'),
                notifyType: z.string().describe('Notification type'),
                delay: z
                  .object({
                    timeAmount: z.number().describe('Delay amount'),
                    timeUnit: z.string().describe('Delay unit')
                  })
                  .describe('Notification delay'),
                recipient: z
                  .object({
                    type: z.string().describe('Recipient type'),
                    id: z.string().optional().describe('Recipient ID'),
                    name: z.string().optional().describe('Recipient name')
                  })
                  .describe('Notification recipient')
              })
            )
            .optional()
            .describe('Escalation rules')
        })
      ),
      totalCount: z.number().describe('Number of escalation policies returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let data = await client.listEscalations();
    let escalations = (data ?? []).map((e: any) => ({
      escalationId: e.id,
      name: e.name,
      description: e.description,
      ownerTeam: e.ownerTeam
        ? {
            teamId: e.ownerTeam.id,
            name: e.ownerTeam.name
          }
        : undefined,
      rules: (e.rules ?? []).map((r: any) => ({
        condition: r.condition,
        notifyType: r.notifyType,
        delay: r.delay,
        recipient: {
          type: r.recipient?.type,
          id: r.recipient?.id,
          name: r.recipient?.name
        }
      }))
    }));

    return {
      output: {
        escalations,
        totalCount: escalations.length
      },
      message: `Found **${escalations.length}** escalation policies.`
    };
  })
  .build();
