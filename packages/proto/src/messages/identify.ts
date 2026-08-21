import z from 'zod';
import { SLATES_PROTOCOL_VERSION } from '../version';

export let slatesMessageProviderIdentifyRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/provider.identify'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageProviderIdentifyRequest = z.infer<
  typeof slatesMessageProviderIdentifyRequest
>;

export let slatesMessageProviderIdentifyResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    protocol: z.literal(SLATES_PROTOCOL_VERSION),
    provider: z.object({
      type: z.literal('provider'),
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional()
    }),
    capabilities: z
      .strictObject({
        webhookVerificationRulesV1: z.boolean(),
        webhookWireV1: z.boolean(),
        webhookActionSpecHashV1: z.boolean(),
        scopedInvocationGrantV1: z.boolean(),
        receiverBoundToolContextV1: z.boolean(),
        webhookSecretNegotiationV1: z.boolean(),
        webhookInboundVerificationV1: z.boolean(),
        webhookInboundBootstrapCaptureV1: z.boolean()
      })
      .optional(),
    docs: z.array(
      z.object({
        name: z.string(),
        url: z.string()
      })
    )
  })
});

export type SlatesMessageProviderIdentifyResponse = z.infer<
  typeof slatesMessageProviderIdentifyResponse
>;

export type SlatesIdentifyRequests = SlatesMessageProviderIdentifyRequest;

export type SlatesIdentifyResponses = SlatesMessageProviderIdentifyResponse;

export let slatesIdentifyResponsesByMethod = {
  'slates/provider.identify': slatesMessageProviderIdentifyResponse
};

export let slatesIdentifyRequestsByMethod = {
  'slates/provider.identify': slatesMessageProviderIdentifyRequest
};
