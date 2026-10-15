import z from 'zod';
import { slatesToolCategory } from '../types';

export let slatesMessageToolCategoriesListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/tool_categories.list'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageToolCategoriesListRequest = z.infer<
  typeof slatesMessageToolCategoriesListRequest
>;

export let slatesMessageToolCategoriesListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    toolCategories: z.array(slatesToolCategory)
  })
});

export type SlatesMessageToolCategoriesListResponse = z.infer<
  typeof slatesMessageToolCategoriesListResponse
>;

export type SlatesToolCategoryRequests = SlatesMessageToolCategoriesListRequest;

export type SlatesToolCategoryResponses = SlatesMessageToolCategoriesListResponse;

export let slatesToolCategoryResponsesByMethod = {
  'slates/tool_categories.list': slatesMessageToolCategoriesListResponse
};

export let slatesToolCategoryRequestsByMethod = {
  'slates/tool_categories.list': slatesMessageToolCategoriesListRequest
};
