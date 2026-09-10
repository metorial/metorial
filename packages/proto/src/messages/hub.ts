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
        .optional()
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

export type SlatesHubNotifications =
  | SlatesMessageHubCapabilitiesSetNotification
  | SlatesMessageHubLiveInvocationSetNotification;

export let slatesHubNotificationsByMethod = {
  'slates/hub.capabilities.set': slatesMessageHubCapabilitiesSetNotification,
  'slates/hub.live_invocation.set': slatesMessageHubLiveInvocationSetNotification
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
          // Understands slates/hub.capabilities.set
          capabilitiesNotification: z.boolean().optional(),
          // Understands slates/hub.live_invocation.set
          liveInvocation: z.boolean().optional()
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
