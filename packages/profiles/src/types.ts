import type { SlatesJsonObject } from '@slates/client';
import type { SlateAuthenticationMethod, SlatesAction } from '@slates/proto';

export interface SlatesStoredAuth {
  id: string;
  authMethodId: string;
  authMethodName?: string;
  authType: SlateAuthenticationMethod['type'];
  input: SlatesJsonObject;
  output: SlatesJsonObject;
  scopes: string[];
  oauthCredentialId?: string;
  clientId?: string;
  clientSecret?: string;
  callbackState?: SlatesJsonObject | null;
  profile?: SlatesJsonObject | null;
  createdAt: string;
  updatedAt: string;
}

export interface SlatesOAuthCredentialRecord {
  id: string;
  name: string;
  authMethodId: string;
  clientId: string;
  clientSecret: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlatesLocalProfileTarget {
  type: 'local';
  entry: string;
  exportName?: string;
}

export type SlatesProfileTarget = SlatesLocalProfileTarget;

export interface SlatesCliStoreScope {
  key: string;
  name?: string;
}

export interface SlatesProfileRecord {
  id: string;
  name: string;
  target: SlatesProfileTarget;
  config: SlatesJsonObject | null;
  auth: Record<string, SlatesStoredAuth>;
  session: {
    id: string;
    state: SlatesJsonObject;
  } | null;
  metadata: {
    provider?: SlatesJsonObject | null;
    actions?: SlatesAction[] | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SlatesCliStoreData {
  version: 3;
  currentProfileId: string | null;
  profiles: Record<string, SlatesProfileRecord>;
  oauthCredentials: Record<string, SlatesOAuthCredentialRecord>;
}
