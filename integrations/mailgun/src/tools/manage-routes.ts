import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { spec } from '../spec';

let routeSchema = z.object({
  routeId: z.string().describe('Route ID'),
  priority: z.number().describe('Route priority (lower = higher priority)'),
  description: z.string().describe('Route description'),
  expression: z.string().describe('Route filter expression'),
  actions: z.array(z.string()).describe('Actions to execute when matched'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

// ==================== List Routes ====================

export let listRoutes = SlateTool.create(spec, {
  name: 'List Routes',
  key: 'list_routes',
  description: `List all inbound email routes. Routes define rules for handling incoming emails by matching recipient addresses or headers, then forwarding, storing, or stopping processing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of routes to return'),
      skip: z.number().optional().describe('Number of routes to skip for pagination')
    })
  )
  .output(
    z.object({
      routes: z.array(routeSchema),
      totalCount: z.number().describe('Total number of routes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listRoutes({ limit: ctx.input.limit, skip: ctx.input.skip });

    let routes = (result.items || []).map(r => ({
      routeId: r.id,
      priority: r.priority,
      description: r.description,
      expression: r.expression,
      actions: r.actions,
      createdAt: r.created_at
    }));

    return {
      output: { routes, totalCount: result.total_count },
      message: `Found **${result.total_count}** route(s). Returned ${routes.length} route(s).`
    };
  })
  .build();

// ==================== Create Route ====================

export let createRoute = SlateTool.create(spec, {
  name: 'Create Route',
  key: 'create_route',
  description: `Create a new inbound email route. Routes match incoming emails using expressions and execute actions like forwarding to a URL or email, storing, or stopping.

**Expression types:**
- \`match_recipient("user@example.com")\` - match specific recipient
- \`match_header("subject", ".*support.*")\` - match header with regex
- \`catch_all()\` - match any unmatched message

**Action types:**
- \`forward("http://myapp.com/incoming")\` - forward to URL
- \`forward("admin@example.com")\` - forward to email
- \`store(notify="http://myapp.com/notify")\` - store and optionally notify
- \`stop()\` - stop further route processing`,
  tags: { destructive: false }
})
  .input(
    z.object({
      expression: z.string().describe('Route filter expression'),
      actions: z.array(z.string()).describe('Actions to execute when matched'),
      priority: z
        .number()
        .optional()
        .describe('Route priority (lower = higher priority, default 0)'),
      description: z.string().optional().describe('Route description')
    })
  )
  .output(
    z.object({
      route: routeSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createRoute({
      expression: ctx.input.expression,
      actions: ctx.input.actions,
      priority: ctx.input.priority,
      description: ctx.input.description
    });

    let r = result.route;
    return {
      output: {
        route: {
          routeId: r.id,
          priority: r.priority,
          description: r.description,
          expression: r.expression,
          actions: r.actions,
          createdAt: r.created_at
        }
      },
      message: `Route created with expression: \`${r.expression}\``
    };
  })
  .build();

// ==================== Update Route ====================

export let updateRoute = SlateTool.create(spec, {
  name: 'Update Route',
  key: 'update_route',
  description: `Update an existing inbound email route's expression, actions, priority, or description.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      routeId: z.string().describe('ID of the route to update'),
      expression: z.string().optional().describe('New route filter expression'),
      actions: z.array(z.string()).optional().describe('New actions to execute'),
      priority: z.number().optional().describe('New route priority'),
      description: z.string().optional().describe('New route description')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.updateRoute(ctx.input.routeId, {
      expression: ctx.input.expression,
      actions: ctx.input.actions,
      priority: ctx.input.priority,
      description: ctx.input.description
    });

    return {
      output: { success: true },
      message: `Route **${ctx.input.routeId}** updated.`
    };
  })
  .build();

// ==================== Delete Route ====================

export let deleteRoute = SlateTool.create(spec, {
  name: 'Delete Route',
  key: 'delete_route',
  description: `Delete an inbound email route permanently.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      routeId: z.string().describe('ID of the route to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteRoute(ctx.input.routeId);

    return {
      output: { success: true },
      message: `Route **${ctx.input.routeId}** deleted.`
    };
  })
  .build();
