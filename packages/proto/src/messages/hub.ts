import z from 'zod';

export let slatesMessageHubCapabilitiesSetNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/hub.capabilities.set'),
  params: z.object({
    capabilities: z.object({
      attachments: z
        .object({
          directUpload: z.object({
            enabled: z.boolean(),
            maxAttachmentSizeBytes: z.number().optional()
          })
        })
        .optional(),
      adapters: z.boolean().optional(),
      triggers: z.boolean().optional()
    })
  })
});

export type SlatesMessageHubCapabilitiesSetNotification = z.infer<
  typeof slatesMessageHubCapabilitiesSetNotification
>;

export let slatesMessageHubLiveInvocationSetNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/hub.live_invocation.set'),
  params: z.object({
    token: z.string(),
    baseUrl: z.string()
  })
});

export type SlatesMessageHubLiveInvocationSetNotification = z.infer<
  typeof slatesMessageHubLiveInvocationSetNotification
>;

export let slatesRuntimeInfo = z.object({
  metorial: z
    .object({
      apiUrl: z.string().url().max(2048),
      region: z.string().max(64).nullish(),
      environment: z.string().max(64).nullish()
    })
    .optional()
});

export type SlatesRuntimeInfo = z.infer<typeof slatesRuntimeInfo>;

export let slatesMessageHubRuntimeInfoSetNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/hub.runtime_info.set'),
  params: z.object({
    runtimeInfo: slatesRuntimeInfo
  })
});

export type SlatesMessageHubRuntimeInfoSetNotification = z.infer<
  typeof slatesMessageHubRuntimeInfoSetNotification
>;

export type SlatesHubNotifications =
  | SlatesMessageHubCapabilitiesSetNotification
  | SlatesMessageHubLiveInvocationSetNotification
  | SlatesMessageHubRuntimeInfoSetNotification;

export let slatesHubNotificationsByMethod = {
  'slates/hub.capabilities.set': slatesMessageHubCapabilitiesSetNotification,
  'slates/hub.live_invocation.set': slatesMessageHubLiveInvocationSetNotification,
  'slates/hub.runtime_info.set': slatesMessageHubRuntimeInfoSetNotification
};

export let slatesMessageProviderCapabilitiesGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/provider.capabilities.get'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageProviderCapabilitiesGetRequest = z.infer<
  typeof slatesMessageProviderCapabilitiesGetRequest
>;

export let slatesMessageProviderCapabilitiesGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    capabilities: z.object({
      hub: z
        .object({
          capabilitiesNotification: z.boolean().optional(),
          liveInvocation: z.boolean().optional(),
          runtimeInfo: z.boolean().optional()
        })
        .optional(),
      provider: z
        .object({
          triggerGroups: z.boolean().optional(),
          toolCategories: z.boolean().optional()
        })
        .optional()
    })
  })
});

export type SlatesMessageProviderCapabilitiesGetResponse = z.infer<
  typeof slatesMessageProviderCapabilitiesGetResponse
>;

export type SlatesHubRequests = SlatesMessageProviderCapabilitiesGetRequest;
export type SlatesHubResponses = SlatesMessageProviderCapabilitiesGetResponse;

export let slatesHubRequestsByMethod = {
  'slates/provider.capabilities.get': slatesMessageProviderCapabilitiesGetRequest
};

export let slatesHubResponsesByMethod = {
  'slates/provider.capabilities.get': slatesMessageProviderCapabilitiesGetResponse
};
