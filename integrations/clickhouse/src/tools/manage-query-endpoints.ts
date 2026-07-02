import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

let queryEndpointResultSchema = z.object({
  raw: z.string().describe('Raw response body returned by the query endpoint'),
  parsed: z.any().optional().describe('Parsed JSON response when the response is JSON'),
  rows: z.array(z.any()).optional().describe('Parsed result rows when available'),
  columns: z.array(z.any()).optional().describe('Column metadata when available'),
  rowCount: z.number().optional().describe('Number of parsed rows when available'),
  statistics: z
    .record(z.string(), z.any())
    .optional()
    .describe('ClickHouse query statistics when returned by the selected format'),
  format: z.string().optional().describe('Requested ClickHouse output format')
});

export let getQueryEndpoint = SlateTool.create(spec, {
  name: 'Get Query Endpoint',
  key: 'get_query_endpoint',
  description: `Retrieve the query endpoint configuration for a service. Query endpoints expose saved SQL queries as HTTP API endpoints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      endpointConfig: z
        .record(z.string(), z.any())
        .describe('Query endpoint configuration details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let config = await client.getQueryEndpoint(ctx.input.serviceId);

    return {
      output: { endpointConfig: config },
      message: `Retrieved query endpoint configuration for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let upsertQueryEndpoint = SlateTool.create(spec, {
  name: 'Upsert Query Endpoint',
  key: 'upsert_query_endpoint',
  description: `Create or update a query endpoint for a service. Query endpoints allow creating API endpoints directly from saved SQL queries. Supports parameterized queries, custom API key access, and CORS policies.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      endpointSettings: z
        .record(z.string(), z.any())
        .describe('Query endpoint configuration to create or update')
    })
  )
  .output(
    z.object({
      endpointConfig: z
        .record(z.string(), z.any())
        .describe('Created or updated endpoint configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.upsertQueryEndpoint(
      ctx.input.serviceId,
      ctx.input.endpointSettings
    );

    return {
      output: { endpointConfig: result },
      message: `Query endpoint configured for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let deleteQueryEndpoint = SlateTool.create(spec, {
  name: 'Delete Query Endpoint',
  key: 'delete_query_endpoint',
  description: `Delete the query endpoint configuration for a service.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteQueryEndpoint(ctx.input.serviceId);

    return {
      output: { deleted: true },
      message: `Query endpoint deleted for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let runQueryEndpoint = SlateTool.create(spec, {
  name: 'Run Query Endpoint',
  key: 'run_query_endpoint',
  description: `Execute a saved ClickHouse Cloud Query API endpoint using OpenAPI key Basic Auth. Supports endpoint versions, ClickHouse response formats, query variables, request timeout, and ClickHouse settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpointId: z.string().min(1).describe('ID of the Query API endpoint to run'),
      format: z
        .string()
        .optional()
        .describe('ClickHouse response format such as JSON, JSONEachRow, or CSV'),
      queryVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Values for parameterized query variables used by the endpoint'),
      endpointVersion: z
        .enum(['1', '2'])
        .optional()
        .describe('Optional x-clickhouse-endpoint-version header'),
      requestTimeoutMs: z
        .number()
        .int()
        .min(1)
        .max(600000)
        .optional()
        .describe('Optional request timeout in milliseconds'),
      clickhouseSettings: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Optional ClickHouse settings passed as query parameters')
    })
  )
  .output(queryEndpointResultSchema)
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.runQueryEndpoint({
      endpointId: ctx.input.endpointId,
      format: ctx.input.format,
      queryVariables: ctx.input.queryVariables,
      endpointVersion: ctx.input.endpointVersion,
      requestTimeoutMs: ctx.input.requestTimeoutMs,
      clickhouseSettings: ctx.input.clickhouseSettings
    });

    return {
      output: result,
      message: `Query endpoint **${ctx.input.endpointId}** executed with **${result.rowCount ?? 0}** parsed rows.`
    };
  })
  .build();
