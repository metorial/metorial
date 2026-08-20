import type { InferClient } from '@slates/adapter';
import { ChatAdapter as chatAdapterDefinition } from './adapter';
import { chatTools } from './tools';
import { chatTriggers } from './triggers';

export let ChatAdapter = chatAdapterDefinition.link({
  tools: chatTools,
  triggers: chatTriggers
});

export type ChatAdapterClient = InferClient<typeof ChatAdapter>;

export * from './builders';
export * from './emoji';
export * from './markdown';
export * from './schema';
export * from './tools';
export * from './triggers';
