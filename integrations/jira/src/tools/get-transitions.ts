import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let getTransitionsTool = SlateTool.create(spec, {
  name: 'Get Transitions',
  key: 'get_transitions',
  description: `Get the available workflow transitions for an issue. Returns the transition IDs and names needed to move an issue to a new status via the Update Issue tool.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID to get transitions for.')
    })
  )
  .output(
    z.object({
      transitions: z.array(
        z.object({
          transitionId: z
            .string()
            .describe('The transition ID (used for transitioning the issue).'),
          name: z.string().describe('The transition name.'),
          toStatus: z.string().optional().describe('The target status name after transition.'),
          toStatusCategory: z
            .string()
            .optional()
            .describe('The target status category (e.g., "To Do", "In Progress", "Done").')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let transitions = await client.getTransitions(ctx.input.issueIdOrKey);

    return {
      output: {
        transitions: transitions.map((t: any) => ({
          transitionId: t.id,
          name: t.name,
          toStatus: t.to?.name,
          toStatusCategory: t.to?.statusCategory?.name
        }))
      },
      message: `Found **${transitions.length}** available transitions for **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();
