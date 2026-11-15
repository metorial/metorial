import z from 'zod';
import { slatesOption } from '../types';
import { withRequestTraces } from './tracing';

export let slatesMessageOptionListOptionsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/option_list.options_list'),
  id: z.string(),
  params: z.object({
    optionListId: z.string(),
    query: z.string().nullable().optional(),
    pageToken: z.any().nullable().optional(),
    params: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageOptionListOptionsListRequest = z.infer<
  typeof slatesMessageOptionListOptionsListRequest
>;

export let slatesMessageOptionListOptionsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    options: z.array(slatesOption),
    nextPageToken: z.any().nullable()
  })
});

export type SlatesMessageOptionListOptionsListResponse = z.infer<
  typeof slatesMessageOptionListOptionsListResponse
>;

export type SlatesOptionListRequests = SlatesMessageOptionListOptionsListRequest;

export type SlatesOptionListResponses = SlatesMessageOptionListOptionsListResponse;

export let slatesOptionListResponsesByMethod = {
  'slates/option_list.options_list': slatesMessageOptionListOptionsListResponse
};

export let slatesOptionListRequestsByMethod = {
  'slates/option_list.options_list': slatesMessageOptionListOptionsListRequest
};
