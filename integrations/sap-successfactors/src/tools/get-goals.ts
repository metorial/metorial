import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGoals = SlateTool.create(spec, {
  name: 'Get Goals',
  key: 'get_goals',
  description: `Retrieve goal plan templates and individual goals from SAP SuccessFactors Performance & Goals module. List available goal plans, or query specific goals within a plan filtered by employee, status, or other criteria.`,
  instructions: [
    'First query goal plan templates to find the planId, then use that planId to query goals within the plan',
    'Goal entities are named Goal_{planId} in the OData model'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      planId: z
        .number()
        .optional()
        .describe(
          'Goal plan template ID to query goals from. Omit to list goal plan templates instead.'
        ),
      filter: z.string().optional().describe('OData $filter expression'),
      select: z.string().optional().describe('Comma-separated fields to return'),
      top: z.number().optional().describe('Maximum records to return').default(100),
      nextPage: z
        .string()
        .optional()
        .describe(
          'Exact nextLink from the preceding result. Keep the entity and original query unchanged; do not combine with skip.'
        ),
      skip: z.number().optional().describe('Number of records to skip')
    })
  )
  .output(
    z.object({
      goalPlans: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of goal plan templates (when planId is not provided)'),
      goals: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of goals within the specified plan (when planId is provided)'),
      nextLink: z
        .string()
        .optional()
        .describe(
          'Exact provider continuation URL; pass it as nextPage to retrieve the next page.'
        ),
      hasMore: z.boolean().optional().describe('Whether SAP returned another page.'),
      totalCount: z.number().optional().describe('Total count of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    if (ctx.input.planId !== undefined) {
      let result = await client.queryGoals(ctx.input.planId, {
        filter: ctx.input.filter,
        select: ctx.input.select,
        top: ctx.input.top,
        skip: ctx.input.skip,
        nextPage: ctx.input.nextPage,
        inlineCount: true
      });

      return {
        output: {
          goals: result.results,
          totalCount: result.count,
          nextLink: result.nextLink,
          hasMore: result.hasMore
        },
        message: `Found **${result.results.length}** goals in plan #${ctx.input.planId}`
      };
    }

    let result = await client.queryGoalPlans({
      filter: ctx.input.filter,
      select: ctx.input.select,
      top: ctx.input.top,
      skip: ctx.input.skip,
      nextPage: ctx.input.nextPage,
      inlineCount: true
    });

    return {
      output: {
        goalPlans: result.results,
        totalCount: result.count,
        nextLink: result.nextLink,
        hasMore: result.hasMore
      },
      message: `Found **${result.results.length}** goal plan templates`
    };
  })
  .build();
