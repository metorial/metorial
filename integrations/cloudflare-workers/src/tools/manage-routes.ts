import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let routeSchema = z.object({
  routeId: z.string().describe('Route UUID'),
  pattern: z.string().describe('URL pattern (e.g. example.com/api/*)'),
  scriptName: z.string().optional().describe('Worker script handling this route')
});

export let listRoutes = SlateTool.create(spec, {
  name: 'List Worker Routes',
  key: 'list_routes',
  description: `List all Worker routes for a Cloudflare zone. Routes map URL patterns to Worker scripts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      zoneId: z.string().describe('Cloudflare Zone ID')
    })
  )
  .output(
    z.object({
      routes: z.array(routeSchema).describe('List of Worker routes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let routes = await client.listRoutes(ctx.input.zoneId);

    let mapped = (routes || []).map((r: any) => ({
      routeId: r.id,
      pattern: r.pattern,
      scriptName: r.script
    }));

    return {
      output: { routes: mapped },
      message: `Found **${mapped.length}** route(s) in zone.`
    };
  })
  .build();

export let createRoute = SlateTool.create(spec, {
  name: 'Create Worker Route',
  key: 'create_route',
  description: `Create a new Worker route that maps a URL pattern on a zone to a Worker script. Use wildcard patterns like \`example.com/api/*\` to match request URLs.`
})
  .input(
    z.object({
      zoneId: z.string().describe('Cloudflare Zone ID'),
      pattern: z.string().describe('URL pattern to match (e.g. example.com/api/*)'),
      scriptName: z.string().describe('Worker script name to handle matched requests')
    })
  )
  .output(routeSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createRoute(
      ctx.input.zoneId,
      ctx.input.pattern,
      ctx.input.scriptName
    );

    return {
      output: {
        routeId: result.id,
        pattern: result.pattern || ctx.input.pattern,
        scriptName: result.script || ctx.input.scriptName
      },
      message: `Created route **${ctx.input.pattern}** → Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let updateRoute = SlateTool.create(spec, {
  name: 'Update Worker Route',
  key: 'update_route',
  description: `Update an existing Worker route's URL pattern and/or the target Worker script.`
})
  .input(
    z.object({
      zoneId: z.string().describe('Cloudflare Zone ID'),
      routeId: z.string().describe('Route UUID to update'),
      pattern: z.string().describe('New URL pattern'),
      scriptName: z.string().describe('Worker script name to handle matched requests')
    })
  )
  .output(routeSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateRoute(
      ctx.input.zoneId,
      ctx.input.routeId,
      ctx.input.pattern,
      ctx.input.scriptName
    );

    return {
      output: {
        routeId: result.id || ctx.input.routeId,
        pattern: result.pattern || ctx.input.pattern,
        scriptName: result.script || ctx.input.scriptName
      },
      message: `Updated route **${ctx.input.routeId}** to **${ctx.input.pattern}** → Worker **${ctx.input.scriptName}**.`
    };
  })
  .build();

export let deleteRoute = SlateTool.create(spec, {
  name: 'Delete Worker Route',
  key: 'delete_route',
  description: `Delete a Worker route from a zone. The Worker will no longer handle requests matching the route's pattern.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      zoneId: z.string().describe('Cloudflare Zone ID'),
      routeId: z.string().describe('Route UUID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteRoute(ctx.input.zoneId, ctx.input.routeId);

    return {
      output: { deleted: true },
      message: `Route **${ctx.input.routeId}** has been deleted.`
    };
  })
  .build();
