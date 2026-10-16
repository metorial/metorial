import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList, readTotal } from '../lib/responses';
import { spec } from '../spec';

let organisationId = z
  .number()
  .optional()
  .describe('Organisation ID from get_current_user. Omit to use the token default.');
let listInput = z.object({
  organisationId,
  nextToken: z.string().optional().describe('Continuation token from a previous response.'),
  size: z.number().optional().describe('Maximum number of results to return.'),
  sortBy: z.string().optional().describe('Provider field to sort by.'),
  sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction.')
});
let listOutput = z.object({
  records: z
    .array(z.any())
    .describe('Provider records with their identifiers and available metadata.'),
  total: z.number().optional(),
  nextToken: z.string().optional(),
  raw: z.any()
});

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Identify the authenticated Borneo user and discover their roles and authorised organisations.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ user: z.any() }))
  .handleInvocation(async ctx => {
    let user = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl
    }).getCurrentUser();
    if (typeof user.username !== 'string' || !user.username) {
      throw createApiServiceError('Borneo did not return the current user username.');
    }
    return { output: { user }, message: 'Retrieved the authenticated Borneo user.' };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  key: 'list_accounts',
  name: 'List Accounts',
  description:
    'Discover Borneo accounts and cloud-account identifiers, connection names, types, and status. Use the returned cloudAccountId with get_cloud_account.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInput)
  .output(listOutput)
  .handleInvocation(async ctx => {
    let data = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    }).listAccounts(ctx.input);
    let records = readList(data, 'accounts');
    return {
      output: { records, total: readTotal(data, 'total'), ...listMetadata(data) },
      message: `Retrieved ${records.length} Borneo accounts.`
    };
  })
  .build();

export let listConnectors = SlateTool.create(spec, {
  key: 'list_connectors',
  name: 'List Connectors',
  description:
    'Discover Borneo connectors and their IDs, resource types, and connection states before creating a scan.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInput)
  .output(listOutput)
  .handleInvocation(async ctx => {
    let data = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    }).listConnectors(ctx.input);
    let records = readList(data, 'connectors');
    return {
      output: { records, total: readTotal(data, 'total'), ...listMetadata(data) },
      message: `Retrieved ${records.length} Borneo connectors.`
    };
  })
  .build();

export let listScanIterations = SlateTool.create(spec, {
  key: 'list_scan_iterations',
  name: 'List Scan Iterations',
  description:
    'List scan executions and their iteration IDs. Pass an iteration ID to get_scan_iteration for its detailed resource results.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    listInput.extend({
      scanId: z
        .string()
        .optional()
        .describe('Scan ID from manage_scan to restrict the executions.')
    })
  )
  .output(listOutput)
  .handleInvocation(async ctx => {
    let data = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    }).listScanIterations(ctx.input);
    let records = readList(data, 'scanIterations');
    return {
      output: { records, total: readTotal(data, 'total'), ...listMetadata(data) },
      message: `Retrieved ${records.length} scan iterations.`
    };
  })
  .build();
