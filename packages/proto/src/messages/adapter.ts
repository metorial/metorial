import z from 'zod';
import { slatesAdapter } from '../types';

/**
 * List Adapters
 */
export let slatesMessageAdaptersListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/adapters.list'),
  id: z.string(),
  params: z.object({
    includeAdapters: z.optional(z.nullable(z.boolean()))
  })
});

export type SlatesMessageAdaptersListRequest = z.infer<
  typeof slatesMessageAdaptersListRequest
>;

export let slatesMessageAdaptersListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    adapters: z.array(slatesAdapter)
  })
});

export type SlatesMessageAdaptersListResponse = z.infer<
  typeof slatesMessageAdaptersListResponse
>;

/**
 * Get Adapter
 */
export let slatesMessageAdapterGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/adapter.get'),
  id: z.string(),
  params: z.object({
    adapterId: z.string()
  })
});

export type SlatesMessageAdapterGetRequest = z.infer<typeof slatesMessageAdapterGetRequest>;

export let slatesMessageAdapterGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    adapter: slatesAdapter
  })
});

export type SlatesMessageAdapterGetResponse = z.infer<typeof slatesMessageAdapterGetResponse>;

export type SlatesAdapterRequests =
  | SlatesMessageAdaptersListRequest
  | SlatesMessageAdapterGetRequest;

export type SlatesAdapterResponses =
  | SlatesMessageAdaptersListResponse
  | SlatesMessageAdapterGetResponse;

export let slatesAdapterResponsesByMethod = {
  'slates/adapters.list': slatesMessageAdaptersListResponse,
  'slates/adapter.get': slatesMessageAdapterGetResponse
};

export let slatesAdapterRequestsByMethod = {
  'slates/adapters.list': slatesMessageAdaptersListRequest,
  'slates/adapter.get': slatesMessageAdapterGetRequest
};
