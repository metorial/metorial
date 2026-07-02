import type z from 'zod';
import type { SlateAuthDocsReference } from '../docs';

type SlateAuthCallbackConfig = Record<string, any>;

export type SlateAuthWithOauth<
  InputType extends {},
  OutputType extends {
    token: string;
    refreshToken?: string;
    expiresAt?: number | string | Date;
  }
> = {
  type: 'auth.oauth';

  name: string;
  key: string;

  scopes: {
    title: string;
    description?: string;
    defaultChecked?: boolean;
    scope: string;
  }[];

  docs?: SlateAuthDocsReference[];

  inputSchema?: z.ZodType<InputType>;

  onInputChanged?: (params: {
    previousInput: InputType | null;
    newInput: InputType;
  }) => Promise<{ input?: InputType } | undefined>;

  getDefaultInput?: () => Promise<InputType>;

  getAuthorizationUrl: (ctx: {
    redirectUri: string;
    state: string;
    input: InputType;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    url: string;
    input?: InputType;
    callbackState?: Record<string, any>;
  }>;

  handleCallback: (ctx: {
    code: string;
    state: string;
    redirectUri: string;
    input: InputType;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    callbackParams?: Record<string, string>;
    callbackState: Record<string, any>;
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    output: OutputType;
    input?: InputType;
    scopes?: string[];
  }>;

  handleTokenRefresh?: (ctx: {
    output: OutputType;
    input: InputType;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    output: OutputType;
    input?: InputType;
  }>;

  getProfile?: (ctx: {
    output: OutputType;
    input: InputType;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    profile: Record<string, any>;
  }>;
};

export type SlateAuthWithToken<InputType extends {}, OutputType extends { token?: string }> = {
  type: 'auth.token';

  name: string;
  key: string;

  inputSchema?: z.ZodType<InputType>;

  docs?: SlateAuthDocsReference[];

  getOutput: (ctx: { input: InputType; config?: SlateAuthCallbackConfig }) => Promise<{
    output: OutputType;
    scopes?: string[];
  }>;

  onInputChanged?: (params: {
    previousInput: InputType;
    newInput: InputType;
  }) => Promise<{ input?: InputType } | undefined>;

  getDefaultInput?: () => Promise<InputType>;

  getProfile?: (ctx: {
    output: OutputType;
    input: InputType;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    profile: Record<string, any>;
  }>;
};

export type SlateAuthWithServiceAccount<InputType extends {}, OutputType extends {}> = {
  type: 'auth.service_account';

  name: string;
  key: string;

  inputSchema?: z.ZodType<InputType>;

  docs?: SlateAuthDocsReference[];

  getOutput: (ctx: { input: InputType; config?: SlateAuthCallbackConfig }) => Promise<{
    output: OutputType;
    scopes?: string[];
  }>;

  onInputChanged?: (params: {
    previousInput: InputType;
    newInput: InputType;
  }) => Promise<{ input?: InputType } | undefined>;

  getDefaultInput?: () => Promise<InputType>;

  getProfile?: (ctx: {
    output: OutputType;
    input: InputType;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    profile: Record<string, any>;
  }>;
};

export type SlateAuthWithCustomData<InputType extends {}, OutputType extends {}> = {
  type: 'auth.custom';

  name: string;
  key: string;

  inputSchema?: z.ZodType<InputType>;

  docs?: SlateAuthDocsReference[];

  getOutput: (ctx: { input: InputType; config?: SlateAuthCallbackConfig }) => Promise<{
    output: OutputType;
    scopes?: string[];
  }>;

  handleTokenRefresh?: (ctx: {
    output: OutputType;
    input: InputType;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    output: OutputType;
    input?: InputType;
  }>;

  onInputChanged?: (params: {
    previousInput: InputType;
    newInput: InputType;
  }) => Promise<{ input?: InputType } | undefined>;

  getDefaultInput?: () => Promise<InputType>;

  getProfile?: (ctx: {
    output: OutputType;
    input: InputType;
    scopes: string[];
    config?: SlateAuthCallbackConfig;
  }) => Promise<{
    profile: Record<string, any>;
  }>;
};

export type SlateAuthWithNone<_InputType extends {}, _OutputType extends {}> = {
  type: 'auth.none';

  name: string;
  key: string;
};

export type SlateAuthType<InputType extends {}, OutputType extends {}> =
  | SlateAuthWithOauth<InputType, OutputType & { token: string }>
  | SlateAuthWithToken<InputType, OutputType & { token?: string }>
  | SlateAuthWithServiceAccount<InputType, OutputType>
  | SlateAuthWithCustomData<InputType, OutputType>
  | SlateAuthWithNone<InputType, OutputType>;
