import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleCloudFunctionsActionScopes } from '../scopes';
import { spec } from '../spec';

let functionSummarySchema = z.object({
  name: z.string().describe('Fully qualified function resource name'),
  functionName: z.string().describe('Short function name extracted from the resource name'),
  state: z
    .string()
    .describe('Current state of the function (ACTIVE, DEPLOYING, FAILED, etc.)'),
  runtime: z.string().optional().describe('Runtime environment (e.g. nodejs20, python312)'),
  url: z.string().optional().describe('The deployed HTTP URL endpoint'),
  environment: z.string().optional().describe('GEN_1 or GEN_2'),
  updateTime: z.string().optional().describe('Last update timestamp'),
  description: z.string().optional().describe('User-provided description'),
  labels: z.record(z.string(), z.string()).optional().describe('User-defined labels')
});

export let listFunctions = SlateTool.create(spec, {
  name: 'List Functions',
  key: 'list_functions',
  description: `List Cloud Functions in a Google Cloud project. Returns a summary of each function including its state, runtime, URL, and labels. Supports filtering and pagination, and can query across all regions or a specific region.`,
  tags: {
    readOnly: true
  }
})
  .scopes(googleCloudFunctionsActionScopes.listFunctions)
  .input(
    z.object({
      location: z
        .string()
        .optional()
        .describe(
          'Specific region to list functions from. Omit to use the configured default region.'
        ),
      allLocations: z
        .boolean()
        .optional()
        .describe('Set to true to list functions across all regions'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression per AIP-160 syntax (e.g. "state=ACTIVE")'),
      orderBy: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to sort by (e.g. "updateTime desc")'),
      pageSize: z
        .number()
        .optional()
        .describe('Maximum number of functions to return (max 1000)'),
      pageToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      functions: z.array(functionSummarySchema).describe('List of functions'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token to retrieve the next page of results'),
      unreachable: z.array(z.string()).optional().describe('Regions that could not be reached')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      region: ctx.input.location || ctx.config.region
    });

    ctx.progress('Fetching functions list...');

    let response = await client.listFunctions({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken,
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      allLocations: ctx.input.allLocations
    });

    let functions = (response.functions || []).map((fn: any) => {
      let nameParts = (fn.name || '').split('/');
      let functionName = nameParts[nameParts.length - 1] || fn.name;

      return {
        name: fn.name,
        functionName,
        state: fn.state || 'UNKNOWN',
        runtime: fn.buildConfig?.runtime,
        url: fn.url || fn.serviceConfig?.uri,
        environment: fn.environment,
        updateTime: fn.updateTime,
        description: fn.description,
        labels: fn.labels
      };
    });

    let location = ctx.input.allLocations
      ? 'all regions'
      : ctx.input.location || ctx.config.region;

    return {
      output: {
        functions,
        nextPageToken: response.nextPageToken,
        unreachable: response.unreachable
      },
      message: `Found **${functions.length}** function(s) in **${location}** for project **${ctx.config.projectId}**.${response.nextPageToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
