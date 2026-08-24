export * from './action';
export * from './adapter';
export * from './auth';
export * from './config';
export * from './controlFlow';
export * from './identify';
export * from './tracing';
export * from './triggerGroup';

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
  type SlatesIdentifyRequests,
  type SlatesIdentifyResponses,
  slatesIdentifyRequestsByMethod,
  slatesIdentifyResponsesByMethod
} from './identify';
import {
  type SlatesTriggerGroupRequests,
  type SlatesTriggerGroupResponses,
  slatesTriggerGroupRequestsByMethod,
  slatesTriggerGroupResponsesByMethod
} from './triggerGroup';

export type SlatesNotifications =
  | SlatesAuthNotifications
  | SlatesConfigNotifications
  | SlatesControlFlowNotifications;

export type SlatesRequests =
  | SlatesActionRequests
  | SlatesAdapterRequests
  | SlatesAuthRequests
  | SlatesConfigRequests
  | SlatesIdentifyRequests
  | SlatesTriggerGroupRequests;

export type SlatesResponses =
  | SlatesActionResponses
  | SlatesAdapterResponses
  | SlatesAuthResponses
  | SlatesConfigResponses
  | SlatesIdentifyResponses
  | SlatesTriggerGroupResponses;

export let slatesResponsesByMethod = {
  ...slatesActionResponsesByMethod,
  ...slatesAdapterResponsesByMethod,
  ...slatesAuthResponsesByMethod,
  ...slatesConfigResponsesByMethod,
  ...slatesIdentifyResponsesByMethod,
  ...slatesTriggerGroupResponsesByMethod
};

export let slatesRequestsByMethod = {
  ...slatesActionRequestsByMethod,
  ...slatesAdapterRequestsByMethod,
  ...slatesAuthRequestsByMethod,
  ...slatesConfigRequestsByMethod,
  ...slatesIdentifyRequestsByMethod,
  ...slatesTriggerGroupRequestsByMethod
};

export let slatesNotificationsByMethod = {
  ...slatesAuthNotificationsByMethod,
  ...slatesConfigNotificationsByMethod,
  ...slatesControlFlowNotificationsByMethod
};

export type SlatesResponsesByMethod = {
  [key in keyof typeof slatesResponsesByMethod]: z.infer<
    (typeof slatesResponsesByMethod)[key]
  >;
};
