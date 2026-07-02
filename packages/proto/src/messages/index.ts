export * from './action';
export * from './auth';
export * from './config';
export * from './controlFlow';
export * from './identify';
export * from './tracing';

import type { z } from 'zod';
import {
  type SlatesActionRequests,
  type SlatesActionResponses,
  slatesActionRequestsByMethod,
  slatesActionResponsesByMethod
} from './action';
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

export type SlatesNotifications =
  | SlatesAuthNotifications
  | SlatesConfigNotifications
  | SlatesControlFlowNotifications;

export type SlatesRequests =
  | SlatesActionRequests
  | SlatesAuthRequests
  | SlatesConfigRequests
  | SlatesIdentifyRequests;

export type SlatesResponses =
  | SlatesActionResponses
  | SlatesAuthResponses
  | SlatesConfigResponses
  | SlatesIdentifyResponses;

export let slatesResponsesByMethod = {
  ...slatesActionResponsesByMethod,
  ...slatesAuthResponsesByMethod,
  ...slatesConfigResponsesByMethod,
  ...slatesIdentifyResponsesByMethod
};

export let slatesRequestsByMethod = {
  ...slatesActionRequestsByMethod,
  ...slatesAuthRequestsByMethod,
  ...slatesConfigRequestsByMethod,
  ...slatesIdentifyRequestsByMethod
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
