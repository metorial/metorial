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
