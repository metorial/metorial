import { SlateTool } from 'slates';
import { z } from 'zod';
import { SitesClient } from '../lib/client';
import { spec } from '../spec';

export let createGoal = SlateTool.create(spec, {
  name: 'Create Goal',
  key: 'create_goal',
  description: `Create or find a conversion goal for a site. Goals can be either pageview goals (triggered when a specific page is visited) or custom event goals (triggered when a named event fires). This endpoint is idempotent — creating a goal that already exists returns the existing one. Requires a Sites API key (Enterprise plan).`,
  instructions: [
    'For pageview goals, provide pagePath. Wildcards are supported (e.g., "/blog/*").',
    'For custom event goals, provide eventName.',
    'Custom properties can narrow down the goal to specific property values.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      goalType: z
        .enum(['event', 'page'])
        .describe('Type of goal: "event" for custom events, "page" for pageview goals'),
      eventName: z
        .string()
        .optional()
        .describe('Event name for custom event goals (required when goalType is "event")'),
      pagePath: z
        .string()
        .optional()
        .describe(
          'Page path for pageview goals, supports wildcards (required when goalType is "page")'
        ),
      displayName: z
        .string()
        .optional()
        .describe('Custom display name for the goal on the dashboard'),
      customProps: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe(
          'Custom property constraints. Keys are property names, values are arrays of allowed values.'
        )
    })
  )
  .output(
    z.object({
      goalId: z.string().describe('ID of the created or found goal'),
      goalType: z.string().describe('Type of the goal'),
      displayName: z.string().optional().describe('Display name of the goal'),
      eventName: z.string().optional().describe('Event name (for event goals)'),
      pagePath: z.string().optional().describe('Page path (for page goals)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createGoal({
      siteId: ctx.input.siteId,
      goalType: ctx.input.goalType,
      eventName: ctx.input.eventName,
      pagePath: ctx.input.pagePath,
      displayName: ctx.input.displayName,
      customProps: ctx.input.customProps
    });

    return {
      output: {
        goalId: String(result.id ?? result.goal_id),
        goalType: result.goal_type ?? ctx.input.goalType,
        displayName: result.display_name,
        eventName: result.event_name,
        pagePath: result.page_path
      },
      message: `Goal **${result.display_name || result.event_name || result.page_path}** created/found for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let listGoals = SlateTool.create(spec, {
  name: 'List Goals',
  key: 'list_goals',
  description: `List all conversion goals configured for a site. Returns both pageview and custom event goals. Requires a Sites API key (Enterprise plan).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      limit: z.number().optional().describe('Maximum number of goals to return'),
      after: z.string().optional().describe('Pagination cursor for next page'),
      before: z.string().optional().describe('Pagination cursor for previous page')
    })
  )
  .output(
    z.object({
      goals: z
        .array(
          z.object({
            goalId: z.string().describe('ID of the goal'),
            goalType: z.string().describe('Type of the goal'),
            displayName: z.string().optional().describe('Display name'),
            eventName: z.string().optional().describe('Event name (for event goals)'),
            pagePath: z.string().optional().describe('Page path (for page goals)')
          })
        )
        .describe('List of goals'),
      meta: z.record(z.string(), z.any()).optional().describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listGoals(ctx.input.siteId, {
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let goals = (result.goals ?? result ?? []).map((g: any) => ({
      goalId: String(g.id ?? g.goal_id),
      goalType: g.goal_type,
      displayName: g.display_name,
      eventName: g.event_name,
      pagePath: g.page_path
    }));

    return {
      output: {
        goals,
        meta: result.meta
      },
      message: `Found **${goals.length}** goal(s) for site **${ctx.input.siteId}**.`
    };
  })
  .build();

export let deleteGoal = SlateTool.create(spec, {
  name: 'Delete Goal',
  key: 'delete_goal',
  description: `Delete a conversion goal from a site. Requires a Sites API key (Enterprise plan).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Domain of the site'),
      goalId: z.string().describe('ID of the goal to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the goal was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SitesClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteGoal(ctx.input.siteId, ctx.input.goalId);

    return {
      output: {
        deleted: true
      },
      message: `Goal **${ctx.input.goalId}** deleted from site **${ctx.input.siteId}**.`
    };
  })
  .build();
