import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let destinationSchema = z.object({
  destinationId: z.string().describe('Unique destination ID'),
  teamId: z.string().describe('Team/project ID'),
  name: z.string().describe('Destination name'),
  description: z.string().nullable().optional().describe('Destination description'),
  type: z.string().optional().describe('Destination type (HTTP, CLI, MOCK_API)'),
  url: z.string().optional().describe('Target HTTP URL'),
  rateLimit: z.number().nullable().optional().describe('Delivery rate limit'),
  rateLimitPeriod: z.string().optional().describe('Rate limit period (second, minute, hour)'),
  httpMethod: z.string().nullable().optional().describe('HTTP method override'),
  authType: z.string().nullable().optional().describe('Outbound authentication type'),
  disabledAt: z.string().nullable().optional().describe('Timestamp if disabled'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageDestinations = SlateTool.create(spec, {
  name: 'Manage Destinations',
  key: 'manage_destinations',
  description: `Create, update, delete, list, enable, or disable Hookdeck destinations. A destination is the target endpoint where events are routed to. Supports HTTP, CLI, and Mock API types with configurable authentication and rate limiting.`,
  instructions: [
    'Destination config includes url, rate_limit, rate_limit_period, http_method, auth_type, and auth.',
    'Auth types: HOOKDECK_SIGNATURE, BASIC_AUTH, API_KEY, BEARER_TOKEN, CUSTOM_SIGNATURE.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'enable', 'disable'])
        .describe('Action to perform'),
      destinationId: z
        .string()
        .optional()
        .describe('Destination ID (required for get, update, delete, enable, disable)'),
      name: z
        .string()
        .optional()
        .describe('Destination name (required for create, optional for update/list)'),
      description: z.string().optional().describe('Destination description'),
      type: z.string().optional().describe('Destination type (HTTP, CLI, MOCK_API)'),
      url: z.string().optional().describe('Target HTTP URL for the destination'),
      rateLimit: z.number().optional().describe('Max delivery rate'),
      rateLimitPeriod: z
        .enum(['second', 'minute', 'hour'])
        .optional()
        .describe('Rate limit period'),
      httpMethod: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method override'),
      authType: z
        .enum([
          'HOOKDECK_SIGNATURE',
          'BASIC_AUTH',
          'API_KEY',
          'BEARER_TOKEN',
          'CUSTOM_SIGNATURE'
        ])
        .optional()
        .describe('Outbound authentication type'),
      authConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Authentication configuration details (varies by authType)'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      destination: destinationSchema.optional().describe('Single destination'),
      destinations: z.array(destinationSchema).optional().describe('List of destinations'),
      deletedId: z.string().optional().describe('ID of the deleted destination'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapDestination = (d: any) => {
      let cfg = (d.config || {}) as Record<string, unknown>;
      return {
        destinationId: d.id as string,
        teamId: d.team_id as string,
        name: d.name as string,
        description: (d.description as string | null) ?? null,
        type: d.type as string | undefined,
        url: cfg.url as string | undefined,
        rateLimit: (cfg.rate_limit as number | null) ?? null,
        rateLimitPeriod: cfg.rate_limit_period as string | undefined,
        httpMethod: (cfg.http_method as string | null) ?? null,
        authType: (cfg.auth_type as string | null) ?? null,
        disabledAt: (d.disabled_at as string | null) ?? null,
        createdAt: d.created_at as string,
        updatedAt: d.updated_at as string
      };
    };

    let buildConfig = () => {
      let config: Record<string, unknown> = {};
      if (ctx.input.url !== undefined) config.url = ctx.input.url;
      if (ctx.input.rateLimit !== undefined) config.rate_limit = ctx.input.rateLimit;
      if (ctx.input.rateLimitPeriod !== undefined)
        config.rate_limit_period = ctx.input.rateLimitPeriod;
      if (ctx.input.httpMethod !== undefined) config.http_method = ctx.input.httpMethod;
      if (ctx.input.authType !== undefined) config.auth_type = ctx.input.authType;
      if (ctx.input.authConfig !== undefined) config.auth = ctx.input.authConfig;
      return Object.keys(config).length > 0 ? config : undefined;
    };

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listDestinations({
          name: ctx.input.name,
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            destinations: result.models.map(d => mapDestination(d)),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** destinations (${result.count} total).`
        };
      }
      case 'get': {
        let destinationId = requireHookdeckInput(
          ctx.input.destinationId,
          'destinationId',
          'get'
        );
        let dest = await client.getDestination(destinationId);
        return {
          output: { destination: mapDestination(dest) },
          message: `Retrieved destination **${dest.name}** (\`${dest.id}\`).`
        };
      }
      case 'create': {
        let name = requireHookdeckInput(ctx.input.name, 'name', 'create');
        let dest = await client.createDestination({
          name,
          description: ctx.input.description,
          type: ctx.input.type,
          config: buildConfig()
        });
        return {
          output: { destination: mapDestination(dest) },
          message: `Created destination **${dest.name}** (\`${dest.id}\`).`
        };
      }
      case 'update': {
        let destinationId = requireHookdeckInput(
          ctx.input.destinationId,
          'destinationId',
          'update'
        );
        let dest = await client.updateDestination(destinationId, {
          name: ctx.input.name,
          description: ctx.input.description,
          type: ctx.input.type,
          config: buildConfig()
        });
        return {
          output: { destination: mapDestination(dest) },
          message: `Updated destination **${dest.name}** (\`${dest.id}\`).`
        };
      }
      case 'delete': {
        let destinationId = requireHookdeckInput(
          ctx.input.destinationId,
          'destinationId',
          'delete'
        );
        let result = await client.deleteDestination(destinationId);
        return {
          output: { deletedId: result.id },
          message: `Deleted destination \`${result.id}\`.`
        };
      }
      case 'enable': {
        let destinationId = requireHookdeckInput(
          ctx.input.destinationId,
          'destinationId',
          'enable'
        );
        let dest = await client.enableDestination(destinationId);
        return {
          output: { destination: mapDestination(dest) },
          message: `Enabled destination **${dest.name}** (\`${dest.id}\`).`
        };
      }
      case 'disable': {
        let destinationId = requireHookdeckInput(
          ctx.input.destinationId,
          'destinationId',
          'disable'
        );
        let dest = await client.disableDestination(destinationId);
        return {
          output: { destination: mapDestination(dest) },
          message: `Disabled destination **${dest.name}** (\`${dest.id}\`).`
        };
      }
    }
  })
  .build();
