export * from './action';
export * from './adapter';
export * from './auth';
export * from './config';
export * from './controlFlow';
export * from './hub';
export * from './identify';
export * from './legacyTrigger';
export * from './toolCategory';
export * from './tracing';
export * from './triggerGroup';
export * from './webhookErrors';

import type { z } from 'zod';
import {
  type SlatesActionRequests,
  type SlatesActionResponses,
  slatesActionRequestsByMethod,
  slatesActionResponsesByMethod
} from './action';
import {
  type SlatesAdapterRequests,
  type SlatesAdapterResponses,
  slatesAdapterRequestsByMethod,
  slatesAdapterResponsesByMethod
} from './adapter';
import {
  type SlatesAuthNotifications,
  type SlatesAuthRequests,
  type SlatesAuthResponses,
  slatesAuthNotificationsByMethod,
  slatesAuthRequestsByMethod,
  slatesAuthResponsesByMethod
} from './auth';
import {
  type SlatesConfigNotifications,
  type SlatesConfigRequests,
  type SlatesConfigResponses,
  slatesConfigNotificationsByMethod,
  slatesConfigRequestsByMethod,
  slatesConfigResponsesByMethod
} from './config';
import {
  type SlatesControlFlowNotifications,
  slatesControlFlowNotificationsByMethod
} from './controlFlow';
import {
  type SlatesHubNotifications,
  type SlatesHubRequests,
  type SlatesHubResponses,
  slatesHubNotificationsByMethod,
  slatesHubRequestsByMethod,
  slatesHubResponsesByMethod
} from './hub';
import {
  type SlatesIdentifyRequests,
  type SlatesIdentifyResponses,
  slatesIdentifyRequestsByMethod,
  slatesIdentifyResponsesByMethod
} from './identify';
import {
  type SlatesLegacyTriggerRequests,
  type SlatesLegacyTriggerResponses,
  slatesLegacyTriggerRequestsByMethod,
  slatesLegacyTriggerResponsesByMethod
} from './legacyTrigger';
import {
  type SlatesToolCategoryRequests,
  type SlatesToolCategoryResponses,
  slatesToolCategoryRequestsByMethod,
  slatesToolCategoryResponsesByMethod
} from './toolCategory';
import {
  type SlatesTriggerGroupRequests,
  type SlatesTriggerGroupResponses,
  slatesTriggerGroupRequestsByMethod,
  slatesTriggerGroupResponsesByMethod
} from './triggerGroup';

export type SlatesNotifications =
  | SlatesAuthNotifications
  | SlatesConfigNotifications
  | SlatesControlFlowNotifications
  | SlatesHubNotifications;

export type SlatesRequests =
  | SlatesActionRequests
  | SlatesAdapterRequests
  | SlatesAuthRequests
  | SlatesConfigRequests
  | SlatesIdentifyRequests
  | SlatesLegacyTriggerRequests
  | SlatesTriggerGroupRequests
  | SlatesToolCategoryRequests
  | SlatesHubRequests
  | SlatesIdentifyRequests;

export type SlatesResponses =
  | SlatesActionResponses
  | SlatesAdapterResponses
  | SlatesAuthResponses
  | SlatesConfigResponses
  | SlatesIdentifyResponses
  | SlatesLegacyTriggerResponses
  | SlatesTriggerGroupResponses
  | SlatesToolCategoryResponses
  | SlatesHubResponses
  | SlatesIdentifyResponses;

export let slatesResponsesByMethod = {
  ...slatesActionResponsesByMethod,
  ...slatesAdapterResponsesByMethod,
  ...slatesAuthResponsesByMethod,
  ...slatesConfigResponsesByMethod,
  ...slatesIdentifyResponsesByMethod,
  ...slatesLegacyTriggerResponsesByMethod,
  ...slatesTriggerGroupResponsesByMethod,
  ...slatesToolCategoryResponsesByMethod,
  ...slatesHubResponsesByMethod,
  ...slatesIdentifyResponsesByMethod
};

export let slatesRequestsByMethod = {
  ...slatesActionRequestsByMethod,
  ...slatesAdapterRequestsByMethod,
  ...slatesAuthRequestsByMethod,
  ...slatesConfigRequestsByMethod,
  ...slatesIdentifyRequestsByMethod,
  ...slatesLegacyTriggerRequestsByMethod,
  ...slatesTriggerGroupRequestsByMethod,
  ...slatesToolCategoryRequestsByMethod,
  ...slatesHubRequestsByMethod,
  ...slatesIdentifyRequestsByMethod
};

export let slatesNotificationsByMethod = {
  ...slatesAuthNotificationsByMethod,
  ...slatesConfigNotificationsByMethod,
  ...slatesControlFlowNotificationsByMethod,
  ...slatesHubNotificationsByMethod
};

export type SlatesResponsesByMethod = {
  [key in keyof typeof slatesResponsesByMethod]: z.infer<
    (typeof slatesResponsesByMethod)[key]
  >;
};
