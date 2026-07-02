import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  jsonObjectSchema,
  mapRequest,
  mapRequestQueue,
  paginationInput,
  pickDefined,
  requireString
} from './shared';

let requestBody = (input: {
  url?: string;
  uniqueKey?: string;
  method?: string;
  headers?: Record<string, any>;
  payload?: string;
  userData?: Record<string, any>;
}) =>
  pickDefined({
    url: input.url,
    uniqueKey: input.uniqueKey,
    method: input.method,
    headers: input.headers,
    payload: input.payload,
    userData: input.userData
  });

export let manageRequestQueue = SlateTool.create(spec, {
  name: 'Manage Request Queue',
  key: 'manage_request_queue',
  description: `Manage Apify request queues and queued crawler requests. Use this to seed, inspect, update, or clean URL queues used by Actors.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_queues',
          'get_queue',
          'create_queue',
          'update_queue',
          'delete_queue',
          'list_requests',
          'add_request',
          'get_request',
          'update_request',
          'delete_request'
        ])
        .describe('Action to perform'),
      queueId: z.string().optional().describe('Request queue ID'),
      name: z.string().optional().describe('Queue name for create/update'),
      requestId: z.string().optional().describe('Request ID for request get/update/delete'),
      url: z.string().optional().describe('Request URL for add/update'),
      uniqueKey: z.string().optional().describe('Request unique key'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
        .optional()
        .describe('HTTP method for queued request'),
      headers: jsonObjectSchema.optional().describe('Request headers'),
      payload: z.string().optional().describe('Request payload/body'),
      userData: jsonObjectSchema.optional().describe('Custom request userData'),
      forefront: z.boolean().optional().describe('Add request to the front of the queue'),
      unnamed: z.boolean().optional().describe('Include unnamed queues in list'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      queueId: z.string().optional(),
      name: z.string().optional(),
      totalRequestCount: z.number().optional(),
      handledRequestCount: z.number().optional(),
      pendingRequestCount: z.number().optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      accessedAt: z.string().optional(),
      queues: z.array(z.record(z.string(), z.any())).optional(),
      total: z.number().optional(),
      requests: z.array(z.record(z.string(), z.any())).optional(),
      requestId: z.string().optional(),
      uniqueKey: z.string().optional(),
      url: z.string().optional(),
      wasAlreadyPresent: z.boolean().optional(),
      wasAlreadyHandled: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list_queues') {
      let result = await client.listRequestQueues({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending,
        unnamed: ctx.input.unnamed
      });
      let queues = result.items.map(mapRequestQueue);
      return {
        output: { queues, total: result.total },
        message: `Found **${result.total}** request queue(s), showing **${queues.length}**.`
      };
    }

    if (ctx.input.action === 'get_queue') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'get_queue');
      let queue = await client.getRequestQueue(queueId);
      return {
        output: mapRequestQueue(queue),
        message: `Retrieved request queue \`${queue.id ?? queueId}\`.`
      };
    }

    if (ctx.input.action === 'create_queue') {
      let queue = await client.createRequestQueue({ name: ctx.input.name });
      return {
        output: mapRequestQueue(queue),
        message: `Created request queue \`${queue.id}\`.`
      };
    }

    if (ctx.input.action === 'update_queue') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'update_queue');
      let body = pickDefined({ name: ctx.input.name });
      ensureAtLeastOne(body, 'update the request queue');
      let queue = await client.updateRequestQueue(queueId, body);
      return {
        output: mapRequestQueue(queue),
        message: `Updated request queue \`${queue.id ?? queueId}\`.`
      };
    }

    if (ctx.input.action === 'delete_queue') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'delete_queue');
      await client.deleteRequestQueue(queueId);
      return {
        output: { queueId, deleted: true },
        message: `Deleted request queue \`${queueId}\`.`
      };
    }

    if (ctx.input.action === 'list_requests') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'list_requests');
      let requests = (
        await client.listRequestQueueHead(queueId, {
          limit: ctx.input.limit
        })
      ).map(mapRequest);
      return {
        output: { queueId, requests },
        message: `Retrieved **${requests.length}** request(s) from queue \`${queueId}\`.`
      };
    }

    if (ctx.input.action === 'add_request') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'add_request');
      requireString(ctx.input.url, 'url', 'add_request');
      let result = await client.addRequestToQueue(queueId, requestBody(ctx.input), {
        forefront: ctx.input.forefront
      });
      let request = mapRequest(result.request ?? result);
      return {
        output: {
          queueId,
          ...request,
          wasAlreadyPresent: result.wasAlreadyPresent,
          wasAlreadyHandled: result.wasAlreadyHandled
        },
        message: `Added request \`${request.requestId ?? request.uniqueKey ?? ctx.input.url}\` to queue \`${queueId}\`.`
      };
    }

    if (ctx.input.action === 'get_request') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'get_request');
      let requestId = requireString(ctx.input.requestId, 'requestId', 'get_request');
      let request = await client.getRequestQueueRequest(queueId, requestId);
      return {
        output: { queueId, ...mapRequest(request) },
        message: `Retrieved request \`${requestId}\` from queue \`${queueId}\`.`
      };
    }

    if (ctx.input.action === 'update_request') {
      let queueId = requireString(ctx.input.queueId, 'queueId', 'update_request');
      let requestId = requireString(ctx.input.requestId, 'requestId', 'update_request');
      let body = requestBody(ctx.input);
      ensureAtLeastOne(body, 'update the queued request');
      let existing = await client.getRequestQueueRequest(queueId, requestId);
      let request = await client.updateRequestQueueRequest(queueId, requestId, {
        ...existing,
        ...body
      });
      return {
        output: { queueId, ...mapRequest(request) },
        message: `Updated request \`${requestId}\` in queue \`${queueId}\`.`
      };
    }

    let queueId = requireString(ctx.input.queueId, 'queueId', 'delete_request');
    let requestId = requireString(ctx.input.requestId, 'requestId', 'delete_request');
    await client.deleteRequestQueueRequest(queueId, requestId);
    return {
      output: { queueId, requestId, deleted: true },
      message: `Deleted request \`${requestId}\` from queue \`${queueId}\`.`
    };
  })
  .build();
