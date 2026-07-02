import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageWorkerRoutesTool = SlateTool.create(spec, {
  name: 'Manage Worker Routes',
  key: 'manage_worker_routes',
  description: `List, create, or delete Worker routes for a zone. Worker routes map URL patterns to Workers scripts, determining which requests are handled by which Worker.`,
  instructions: [
    'Route patterns use glob syntax, e.g. "example.com/api/*" or "*.example.com/*".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      zoneId: z.string().describe('Zone ID'),
      routeId: z.string().optional().describe('Route ID for delete'),
      pattern: z
        .string()
        .optional()
        .describe('URL pattern for the route (e.g. example.com/api/*)'),
      scriptName: z.string().optional().describe('Worker script name to bind to this route')
    })
  )
  .output(
    z.object({
      routes: z
        .array(
          z.object({
            routeId: z.string(),
            pattern: z.string(),
            scriptName: z.string().optional()
          })
        )
        .optional(),
      createdRoute: z
        .object({
          routeId: z.string(),
          pattern: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, zoneId } = ctx.input;

    if (action === 'list') {
      let response = await client.listWorkerRoutes(zoneId);
      let routes = response.result.map((r: any) => ({
        routeId: r.id,
        pattern: r.pattern,
        scriptName: r.script
      }));
      return {
        output: { routes },
        message: `Found **${routes.length}** Worker route(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.pattern || !ctx.input.scriptName) {
        throw cloudflareServiceError('pattern and scriptName are required');
      }
      let response = await client.createWorkerRoute(zoneId, {
        pattern: ctx.input.pattern,
        script: ctx.input.scriptName
      });
      return {
        output: { createdRoute: { routeId: response.result.id, pattern: ctx.input.pattern } },
        message: `Created Worker route \`${ctx.input.pattern}\` → **${ctx.input.scriptName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.routeId) throw cloudflareServiceError('routeId is required for delete');
      await client.deleteWorkerRoute(zoneId, ctx.input.routeId);
      return {
        output: { deleted: true },
        message: `Deleted Worker route \`${ctx.input.routeId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
