import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { auth0ServiceError, requireField } from '../lib/errors';
import { spec } from '../spec';

let filterSchema = z.object({
  type: z.string().describe('Filter type, such as category'),
  name: z.string().describe('Filter value/name')
});

let mapLogStream = (stream: any) => ({
  logStreamId: stream.id,
  name: stream.name,
  type: stream.type,
  status: stream.status,
  sink: stream.sink,
  filters: stream.filters
});

export let manageLogStreamsTool = SlateTool.create(spec, {
  name: 'Manage Log Streams',
  key: 'manage_log_streams',
  description:
    'Create, update, delete, get, or list Auth0 log streams for delivering tenant logs to HTTP webhooks and supported event destinations.',
  instructions: [
    'For create, provide type and sink. For HTTP streams, sink commonly includes httpEndpoint, httpContentType, httpContentFormat, and optional httpAuthorization.',
    'For update, provide logStreamId plus any of name, status, or filters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      logStreamId: z
        .string()
        .optional()
        .describe('Log stream ID; required for get, update, and delete'),
      name: z.string().optional().describe('Log stream name; required for create'),
      type: z
        .string()
        .optional()
        .describe(
          'Log stream type, such as http, eventbridge, eventgrid, splunk, sumo, or datadog'
        ),
      sink: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Destination-specific sink configuration; required for create'),
      status: z
        .enum(['active', 'paused'])
        .optional()
        .describe('Log stream status for update action'),
      filters: z
        .array(filterSchema)
        .optional()
        .describe('Optional log stream filters for create or update')
    })
  )
  .output(
    z.object({
      logStream: z
        .object({
          logStreamId: z.string(),
          name: z.string(),
          type: z.string(),
          status: z.string().optional(),
          sink: z.record(z.string(), z.unknown()).optional(),
          filters: z.array(filterSchema).optional()
        })
        .optional()
        .describe('Log stream details'),
      logStreams: z
        .array(
          z.object({
            logStreamId: z.string(),
            name: z.string(),
            type: z.string(),
            status: z.string().optional(),
            sink: z.record(z.string(), z.unknown()).optional(),
            filters: z.array(filterSchema).optional()
          })
        )
        .optional()
        .describe('List of log streams'),
      deleted: z.boolean().optional().describe('Whether the log stream was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listLogStreams();
      let logStreams = (Array.isArray(result) ? result : (result.log_streams ?? [])).map(
        mapLogStream
      );
      return {
        output: { logStreams },
        message: `Found **${logStreams.length}** log stream(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let logStreamId = requireField(ctx.input.logStreamId, 'logStreamId', 'get');
      let logStream = await client.getLogStream(logStreamId);
      return {
        output: { logStream: mapLogStream(logStream) },
        message: `Retrieved log stream **${logStream.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requireField(ctx.input.name, 'name', 'create');
      let type = requireField(ctx.input.type, 'type', 'create');
      let sink = requireField(ctx.input.sink, 'sink', 'create');
      let logStream = await client.createLogStream({
        name,
        type,
        sink,
        filters: ctx.input.filters
      });
      return {
        output: { logStream: mapLogStream(logStream) },
        message: `Created log stream **${logStream.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let logStreamId = requireField(ctx.input.logStreamId, 'logStreamId', 'update');
      let logStream = await client.updateLogStream(logStreamId, {
        name: ctx.input.name,
        status: ctx.input.status,
        filters: ctx.input.filters
      });
      return {
        output: { logStream: mapLogStream(logStream) },
        message: `Updated log stream **${logStream.name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let logStreamId = requireField(ctx.input.logStreamId, 'logStreamId', 'delete');
      await client.deleteLogStream(logStreamId);
      return {
        output: { deleted: true },
        message: `Deleted log stream **${logStreamId}**.`
      };
    }

    throw auth0ServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
