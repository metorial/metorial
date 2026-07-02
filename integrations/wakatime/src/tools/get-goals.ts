import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getGoals = SlateTool.create(spec, {
  name: 'Get Goals',
  key: 'get_goals',
  description: `Retrieve all coding goals. Goals define target coding time per day or week, can be scoped to specific languages, editors, or projects, and track success/failure over time.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      goals: z
        .array(
          z
            .object({
              goalId: z.string().describe('Unique goal ID'),
              title: z.string().describe('Goal title'),
              type: z.string().describe('Goal type (e.g., coding, languages)'),
              targetSeconds: z.number().describe('Target seconds to achieve'),
              frequency: z.string().optional().describe('Goal frequency (daily, weekly)'),
              isEnabled: z.boolean().optional().describe('Whether the goal is active'),
              isSnoozed: z.boolean().optional().describe('Whether the goal is snoozed'),
              isCurrentUserOwner: z
                .boolean()
                .optional()
                .describe('Whether current user owns this goal'),
              statusPercent: z.number().optional().describe('Current progress percentage'),
              currentStatus: z
                .string()
                .optional()
                .describe('Current goal status (success, fail, pending)'),
              languages: z
                .array(z.string())
                .optional()
                .describe('Languages the goal is scoped to'),
              editors: z
                .array(z.string())
                .optional()
                .describe('Editors the goal is scoped to'),
              projects: z
                .array(z.string())
                .optional()
                .describe('Projects the goal is scoped to'),
              createdAt: z.string().optional().describe('When the goal was created')
            })
            .passthrough()
        )
        .describe('List of goals'),
      totalGoals: z.number().describe('Total number of goals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let goals = await client.getGoals();

    let mapped = (goals || []).map((g: any) => ({
      goalId: g.id ?? '',
      title: g.title ?? '',
      type: g.type ?? '',
      targetSeconds: g.seconds ?? 0,
      frequency: g.frequency,
      isEnabled: g.is_enabled,
      isSnoozed: g.is_snoozed,
      isCurrentUserOwner: g.is_current_user_owner,
      statusPercent: g.status_percent,
      currentStatus: g.status,
      languages: g.languages?.map((l: any) => l.name || l) || [],
      editors: g.editors?.map((e: any) => e.name || e) || [],
      projects: g.projects?.map((p: any) => p.name || p) || [],
      createdAt: g.created_at
    }));

    return {
      output: {
        goals: mapped,
        totalGoals: mapped.length
      },
      message: `Found **${mapped.length}** coding goal(s).`
    };
  })
  .build();
