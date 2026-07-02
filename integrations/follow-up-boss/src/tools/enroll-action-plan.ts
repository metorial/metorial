import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let enrollActionPlan = SlateTool.create(spec, {
  name: 'Enroll in Action Plan',
  key: 'enroll_action_plan',
  description: `Enroll a contact in an action plan, or list available action plans. Action plans are automated follow-up sequences that send emails, texts, and create tasks on a schedule.`,
  instructions: [
    'To list available action plans, omit personId and actionPlanId.',
    'To enroll a contact, provide both personId and actionPlanId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Contact ID to enroll in the action plan'),
      actionPlanId: z.number().optional().describe('Action plan ID to enroll the contact in'),
      limit: z.number().optional().describe('Number of results when listing action plans'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      enrolled: z.boolean().optional(),
      enrollmentId: z.number().optional(),
      actionPlans: z
        .array(
          z.object({
            actionPlanId: z.number(),
            name: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.personId && ctx.input.actionPlanId) {
      let result = await client.enrollInActionPlan({
        personId: ctx.input.personId,
        actionPlanId: ctx.input.actionPlanId
      });

      return {
        output: {
          enrolled: true,
          enrollmentId: result.id
        },
        message: `Enrolled contact **${ctx.input.personId}** in action plan **${ctx.input.actionPlanId}**.`
      };
    }

    let result = await client.listActionPlans({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let plans = result.actionPlans || [];

    return {
      output: {
        actionPlans: plans.map((p: any) => ({
          actionPlanId: p.id,
          name: p.name
        }))
      },
      message: `Found **${plans.length}** action plan(s).`
    };
  })
  .build();
