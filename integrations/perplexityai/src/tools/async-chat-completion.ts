import { SlateTool } from 'slates';
import { z } from 'zod';
import type {
  AsyncChatCompletionResponse,
  ListAsyncChatCompletionsResponse
} from '../lib/client';
import { PerplexityClient } from '../lib/client';
import { perplexityServiceError } from '../lib/errors';
import { spec } from '../spec';
import { buildSonarRequest, sonarInputSchema } from './sonar';

let responseRecordSchema = z.record(z.string(), z.unknown());

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let extractRequestId = (response: AsyncChatCompletionResponse) => {
  for (let key of ['id', 'request_id', 'api_request']) {
    let value = response[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  throw perplexityServiceError(
    'Perplexity async chat completion response did not include a request ID.'
  );
};

let toAsyncRecord = (response: AsyncChatCompletionResponse): Record<string, unknown> => ({
  ...response
});

let extractAsyncRequests = (response: ListAsyncChatCompletionsResponse) => {
  if (Array.isArray(response)) {
    return response.map(toAsyncRecord);
  }

  for (let key of ['data', 'requests', 'items']) {
    let value = response[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord).map(item => ({ ...item }));
    }
  }

  return [];
};

export let createAsyncChatCompletion = SlateTool.create(spec, {
  name: 'Create Async Chat Completion',
  key: 'create_async_chat_completion',
  description:
    'Submit a Sonar chat completion request to Perplexity async processing. Use this for long-running Sonar Deep Research or batch workflows where the response can be fetched later.',
  instructions: [
    'Use get_async_chat_completion with the returned requestId to retrieve the result.',
    'Use list_async_chat_completions to inspect recent async requests for the authenticated account.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(sonarInputSchema)
  .output(
    z.object({
      requestId: z.string().describe('Async request identifier'),
      status: z.string().optional().describe('Current async request status'),
      request: responseRecordSchema.describe('Raw async request metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);
    let response = await client.createAsyncChatCompletion(buildSonarRequest(ctx.input));
    let requestId = extractRequestId(response);

    return {
      output: {
        requestId,
        status: response.status,
        request: toAsyncRecord(response)
      },
      message: `Created Perplexity async chat completion request **${requestId}**${response.status ? ` with status **${response.status}**` : ''}.`
    };
  })
  .build();

export let getAsyncChatCompletion = SlateTool.create(spec, {
  name: 'Get Async Chat Completion',
  key: 'get_async_chat_completion',
  description:
    'Retrieve the current status and response payload for a Perplexity async Sonar chat completion request.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe('Async request identifier returned by create_async_chat_completion')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Async request identifier'),
      status: z.string().optional().describe('Current async request status'),
      request: responseRecordSchema.describe('Raw async request/response payload')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);
    let response = await client.getAsyncChatCompletion(ctx.input.requestId);
    let requestId = extractRequestId(response);

    return {
      output: {
        requestId,
        status: response.status,
        request: toAsyncRecord(response)
      },
      message: `Fetched Perplexity async chat completion request **${requestId}**${response.status ? ` with status **${response.status}**` : ''}.`
    };
  })
  .build();

export let listAsyncChatCompletions = SlateTool.create(spec, {
  name: 'List Async Chat Completions',
  key: 'list_async_chat_completions',
  description:
    'List Perplexity async Sonar chat completion requests visible to the authenticated account.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      requests: z.array(responseRecordSchema).describe('Async chat completion requests'),
      requestCount: z.number().describe('Number of async requests returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerplexityClient(ctx.auth.token);
    let response = await client.listAsyncChatCompletions();
    let requests = extractAsyncRequests(response);

    return {
      output: {
        requests,
        requestCount: requests.length
      },
      message: `Found **${requests.length}** Perplexity async chat completion requests.`
    };
  })
  .build();
