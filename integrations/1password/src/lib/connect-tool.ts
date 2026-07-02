import { createApiServiceError } from 'slates';
import { ConnectClient } from './client';

type ConnectToolContext = {
  auth: {
    token: string;
    authType?: string;
  };
  config: {
    connectServerUrl?: string;
  };
};

export let createConnectClient = (ctx: ConnectToolContext) => {
  if (ctx.auth.authType !== 'connect') {
    throw createApiServiceError(
      'This tool requires the 1Password Connect Server Token auth method. Service Account and Events API tokens cannot call the Connect REST API.'
    );
  }

  if (!ctx.config.connectServerUrl) {
    throw createApiServiceError(
      'Connect server URL is required. Set connectServerUrl in the integration configuration.'
    );
  }

  return new ConnectClient({
    token: ctx.auth.token,
    serverUrl: ctx.config.connectServerUrl
  });
};
