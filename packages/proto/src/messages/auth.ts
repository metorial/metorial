import z from 'zod';
import { slatesAuthenticationMethod } from '../types';
import { withRequestTraces } from './tracing';

/**
 * Set Authentication
 */
export let slatesMessageSetAuthNotification = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.set'),
  params: z.object({
    authenticationMethodId: z.string(),
    output: z.record(z.string(), z.any())
  })
});

export type SlatesMessageSetAuthNotification = z.infer<
  typeof slatesMessageSetAuthNotification
>;

/**
 * List Authentication Methods
 */
export let slatesMessageAuthMethodsListRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.methods.list'),
  id: z.string(),
  params: z.object({})
});

export type SlatesMessageAuthMethodsListRequest = z.infer<
  typeof slatesMessageAuthMethodsListRequest
>;

export let slatesMessageAuthMethodsListResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    authenticationMethods: z.array(slatesAuthenticationMethod)
  })
});

export type SlatesMessageAuthMethodsListResponse = z.infer<
  typeof slatesMessageAuthMethodsListResponse
>;

/**
 * Get Authentication Method
 */
export let slatesMessageAuthMethodGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.method.get'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string()
  })
});

export type SlatesMessageAuthMethodGetRequest = z.infer<
  typeof slatesMessageAuthMethodGetRequest
>;

export let slatesMessageAuthMethodGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.object({
    authenticationMethod: slatesAuthenticationMethod
  })
});

export type SlatesMessageAuthMethodGetResponse = z.infer<
  typeof slatesMessageAuthMethodGetResponse
>;

/**
 * Authentication Input Changed
 */
export let slatesMessageAuthInputChangedRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.input.changed'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),
    previousInput: z.record(z.string(), z.any()).nullable(),
    newInput: z.record(z.string(), z.any())
  })
});

export type SlatesMessageAuthInputChangedRequest = z.infer<
  typeof slatesMessageAuthInputChangedRequest
>;

export let slatesMessageAuthInputChangedResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    input: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageAuthInputChangedResponse = z.infer<
  typeof slatesMessageAuthInputChangedResponse
>;

/**
 * Get Default Inputs
 */
export let slatesMessageAuthDefaultInputGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.input.get_default'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string()
  })
});

export type SlatesMessageAuthDefaultInputGetRequest = z.infer<
  typeof slatesMessageAuthDefaultInputGetRequest
>;

export let slatesMessageAuthDefaultInputGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    input: z.record(z.string(), z.any())
  })
});

export type SlatesMessageAuthDefaultInputGetResponse = z.infer<
  typeof slatesMessageAuthDefaultInputGetResponse
>;

/**
 * Get Authorization Url
 */
export let slatesMessageAuthAuthorizationUrlGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.authorization_url.get'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),

    redirectUri: z.string(),
    state: z.string(),
    input: z.record(z.string(), z.any()),
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.array(z.string())
  })
});

export type SlatesMessageAuthAuthorizationUrlGetRequest = z.infer<
  typeof slatesMessageAuthAuthorizationUrlGetRequest
>;

export let slatesMessageAuthAuthorizationUrlGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    authorizationUrl: z.string(),
    input: z.record(z.string(), z.any()).optional(),
    callbackState: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageAuthAuthorizationUrlGetResponse = z.infer<
  typeof slatesMessageAuthAuthorizationUrlGetResponse
>;

/**
 * Handle Authorization Callback
 */
export let slatesMessageAuthAuthorizationCallbackHandleRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.authorization_callback.handle'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),

    code: z.string(),
    state: z.string(),
    redirectUri: z.string(),
    input: z.record(z.string(), z.any()),
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.array(z.string()),
    callbackParams: z.record(z.string(), z.string()).optional(),
    callbackState: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageAuthAuthorizationCallbackHandleRequest = z.infer<
  typeof slatesMessageAuthAuthorizationCallbackHandleRequest
>;

export let slatesMessageAuthAuthorizationCallbackHandleResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    output: z.record(z.string(), z.any()),
    input: z.record(z.string(), z.any()).optional(),
    scopes: z.array(z.string()).optional()
  })
});

export type SlatesMessageAuthAuthorizationCallbackHandleResponse = z.infer<
  typeof slatesMessageAuthAuthorizationCallbackHandleResponse
>;

/**
 * Handle Token Refresh
 */
export let slatesMessageAuthTokenRefreshHandleRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.token_refresh.handle'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),

    output: z.record(z.string(), z.any()),
    input: z.record(z.string(), z.any()),
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.array(z.string())
  })
});

export type SlatesMessageAuthTokenRefreshHandleRequest = z.infer<
  typeof slatesMessageAuthTokenRefreshHandleRequest
>;

export let slatesMessageAuthTokenRefreshHandleResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    output: z.record(z.string(), z.any()),
    input: z.record(z.string(), z.any()).optional()
  })
});

export type SlatesMessageAuthTokenRefreshHandleResponse = z.infer<
  typeof slatesMessageAuthTokenRefreshHandleResponse
>;

/**
 * Get Profile
 */
export let slatesMessageAuthProfileGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.profile.get'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),

    output: z.record(z.string(), z.any()),
    input: z.record(z.string(), z.any()),
    scopes: z.array(z.string())
  })
});

export type SlatesMessageAuthProfileGetRequest = z.infer<
  typeof slatesMessageAuthProfileGetRequest
>;

export let slatesMessageAuthProfileGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    profile: z.record(z.string(), z.any())
  })
});

export type SlatesMessageAuthProfileGetResponse = z.infer<
  typeof slatesMessageAuthProfileGetResponse
>;

/**
 * Get Auth Output
 */
export let slatesMessageAuthOutputGetRequest = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('slates/auth.output.get'),
  id: z.string(),
  params: z.object({
    authenticationMethodId: z.string(),

    input: z.record(z.string(), z.any())
  })
});

export type SlatesMessageAuthOutputGetRequest = z.infer<
  typeof slatesMessageAuthOutputGetRequest
>;

export let slatesMessageAuthOutputGetResponse = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: withRequestTraces({
    output: z.record(z.string(), z.any())
  })
});

export type SlatesMessageAuthOutputGetResponse = z.infer<
  typeof slatesMessageAuthOutputGetResponse
>;

export type SlatesAuthRequests =
  | SlatesMessageAuthMethodsListRequest
  | SlatesMessageAuthMethodGetRequest
  | SlatesMessageAuthInputChangedRequest
  | SlatesMessageAuthDefaultInputGetRequest
  | SlatesMessageAuthAuthorizationUrlGetRequest
  | SlatesMessageAuthAuthorizationCallbackHandleRequest
  | SlatesMessageAuthTokenRefreshHandleRequest
  | SlatesMessageAuthProfileGetRequest
  | SlatesMessageAuthOutputGetRequest;

export type SlatesAuthResponses =
  | SlatesMessageAuthMethodsListResponse
  | SlatesMessageAuthMethodGetResponse
  | SlatesMessageAuthInputChangedResponse
  | SlatesMessageAuthDefaultInputGetResponse
  | SlatesMessageAuthAuthorizationUrlGetResponse
  | SlatesMessageAuthAuthorizationCallbackHandleResponse
  | SlatesMessageAuthTokenRefreshHandleResponse
  | SlatesMessageAuthProfileGetResponse
  | SlatesMessageAuthOutputGetResponse;

export type SlatesAuthNotifications = SlatesMessageSetAuthNotification;

export let slatesAuthResponsesByMethod = {
  'slates/auth.methods.list': slatesMessageAuthMethodsListResponse,
  'slates/auth.method.get': slatesMessageAuthMethodGetResponse,
  'slates/auth.input.changed': slatesMessageAuthInputChangedResponse,
  'slates/auth.input.get_default': slatesMessageAuthDefaultInputGetResponse,
  'slates/auth.authorization_url.get': slatesMessageAuthAuthorizationUrlGetResponse,
  'slates/auth.authorization_callback.handle':
    slatesMessageAuthAuthorizationCallbackHandleResponse,
  'slates/auth.token_refresh.handle': slatesMessageAuthTokenRefreshHandleResponse,
  'slates/auth.profile.get': slatesMessageAuthProfileGetResponse,
  'slates/auth.output.get': slatesMessageAuthOutputGetResponse
};

export let slatesAuthRequestsByMethod = {
  'slates/auth.methods.list': slatesMessageAuthMethodsListRequest,
  'slates/auth.method.get': slatesMessageAuthMethodGetRequest,
  'slates/auth.input.changed': slatesMessageAuthInputChangedRequest,
  'slates/auth.input.get_default': slatesMessageAuthDefaultInputGetRequest,
  'slates/auth.authorization_url.get': slatesMessageAuthAuthorizationUrlGetRequest,
  'slates/auth.authorization_callback.handle':
    slatesMessageAuthAuthorizationCallbackHandleRequest,
  'slates/auth.token_refresh.handle': slatesMessageAuthTokenRefreshHandleRequest,
  'slates/auth.profile.get': slatesMessageAuthProfileGetRequest,
  'slates/auth.output.get': slatesMessageAuthOutputGetRequest
};

export let slatesAuthNotificationsByMethod = {
  'slates/auth.set': slatesMessageSetAuthNotification
};
