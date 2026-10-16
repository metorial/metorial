import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let requestSchema = z.object({
  issueId: z.string(),
  issueKey: z.string(),
  summary: z.string().optional(),
  serviceDeskId: z.string().optional(),
  requestTypeId: z.string().optional(),
  currentStatus: z.string().optional(),
  statusCategory: z.string().optional(),
  reporterAccountId: z.string().optional(),
  reporterName: z.string().optional(),
  created: z.string().optional(),
  portalUrl: z.string().optional(),
  agentUrl: z.string().optional(),
  requestFieldValues: z
    .array(
      z.object({
        fieldId: z.string(),
        label: z.string().optional(),
        value: z.unknown().optional(),
        renderedValue: z.record(z.string(), z.unknown()).optional()
      })
    )
    .optional()
});

let mapRequest = (request: any) => ({
  issueId: request.issueId,
  issueKey: request.issueKey,
  summary: request.summary,
  serviceDeskId: request.serviceDeskId,
  requestTypeId: request.requestTypeId,
  currentStatus: request.currentStatus?.status,
  statusCategory: request.currentStatus?.statusCategory,
  reporterAccountId: request.reporter?.accountId,
  reporterName: request.reporter?.displayName,
  created: request.createdDate?.iso8601,
  portalUrl: request._links?.web,
  agentUrl: request._links?.agent,
  requestFieldValues: request.requestFieldValues
});

export let getCustomerRequestTool = SlateTool.create(spec, {
  name: 'Get Customer Request',
  key: 'get_customer_request',
  description:
    'Read a customer request with its current status, request fields, reporter, and customer portal link. Customers can read requests they own or participate in.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Customer request issue key or ID')
    })
  )
  .output(requestSchema)
  .handleInvocation(async ctx => {
    let request = await new JiraClient(ctx.auth).getCustomerRequest(ctx.input.issueIdOrKey);
    return {
      output: mapRequest(request),
      message: `Retrieved customer request ${request.issueKey}.`
    };
  })
  .build();

export let listCustomerRequestsTool = SlateTool.create(spec, {
  name: 'List Customer Requests',
  key: 'list_customer_requests',
  description:
    'List customer requests visible to the authenticated user, ordered by latest activity. Filter by text, ownership, status, or service desk.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchTerm: z.string().optional().describe('Text to match against requests'),
      requestOwnership: z
        .array(z.string())
        .optional()
        .describe('Request ownership filters accepted by Jira Service Management'),
      requestStatus: z
        .string()
        .optional()
        .describe('Request status filter accepted by Jira Service Management'),
      serviceDeskId: z
        .string()
        .optional()
        .describe('Service desk ID. Call list_service_desks to discover accessible IDs.'),
      start: z.number().optional().describe('Starting index for pagination'),
      limit: z.number().optional().describe('Maximum number of requests on this page')
    })
  )
  .output(
    z.object({
      requests: z.array(requestSchema),
      start: z.number().optional(),
      limit: z.number().optional(),
      size: z.number().optional(),
      isLastPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let page = await new JiraClient(ctx.auth).getCustomerRequests(ctx.input);
    let requests = page.values.map(mapRequest);
    return {
      output: {
        requests,
        start: page.start,
        limit: page.limit,
        size: page.size,
        isLastPage: page.isLastPage
      },
      message: `Retrieved ${requests.length} customer requests on this page.`
    };
  })
  .build();
