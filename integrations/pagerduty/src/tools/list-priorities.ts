import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let listPriorities = SlateTool.create(spec, {
  name: 'List Priorities',
  key: 'list_priorities',
  description: `List all configured incident priorities for the PagerDuty account. Priorities are used to classify the importance of incidents and can be set when creating or updating incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      priorities: z.array(
        z.object({
          priorityId: z.string().describe('Priority ID'),
          name: z.string().optional().describe('Priority name'),
          description: z.string().optional().describe('Priority description'),
          order: z.number().optional().describe('Priority order (lower is higher priority)'),
          color: z.string().optional().describe('Display color')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let priorities = await client.listPriorities();

    let result = priorities.map(p => ({
      priorityId: p.id,
      name: p.name,
      description: p.description,
      order: p.order,
      color: p.color
    }));

    return {
      output: { priorities: result },
      message: `Found **${result.length}** priority level(s).`
    };
  })
  .build();
