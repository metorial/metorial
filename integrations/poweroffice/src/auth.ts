import { SlateAuth } from 'slates';
import { z } from 'zod';
import {
  exchangePowerOfficeClientCredentials,
  type PowerOfficeAuthInput,
  type PowerOfficeAuthOutput
} from './lib/client';

const authInputSchema = z.object({
  environment: z
    .enum(['demo', 'production'])
    .describe('PowerOffice environment. Demo and production credentials cannot be mixed.'),
  appKey: z
    .string()
    .min(1)
    .describe('PowerOffice application key for the selected environment.'),
  clientKey: z
    .string()
    .min(1)
    .describe('PowerOffice client key for this client integration instance.'),
  subscriptionKey: z
    .string()
    .min(1)
    .describe('PowerOffice product subscription key for the selected environment.')
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('PowerOffice bearer access token.'),
      expiresAt: z.string().optional().describe('ISO timestamp when the token expires.'),
      tokenType: z.string().optional().describe('OAuth token type returned by PowerOffice.'),
      environment: z
        .enum(['demo', 'production'])
        .describe('PowerOffice environment for API calls.'),
      subscriptionKey: z
        .string()
        .describe('PowerOffice product subscription key for API calls.')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Credentials',
    key: 'client_credentials',
    docs: [
      {
        type: 'docs.auth.custom',
        name: 'PowerOffice authentication',
        url: 'https://developer.poweroffice.net/documentation/authentication'
      }
    ],
    inputSchema: authInputSchema,
    getOutput: async (ctx: { input: PowerOfficeAuthInput }) => ({
      output: await exchangePowerOfficeClientCredentials(ctx.input)
    }),
    handleTokenRefresh: async (ctx: {
      input: PowerOfficeAuthInput;
      output: PowerOfficeAuthOutput;
    }) => ({
      output: await exchangePowerOfficeClientCredentials(ctx.input, 'refresh access token')
    }),
    getProfile: async (ctx: { output: PowerOfficeAuthOutput }) => {
      let { PowerOfficeClient } = await import('./lib/client');
      let client = new PowerOfficeClient(ctx.output);
      let info = await client.getClientIntegrationInfo();

      return {
        profile: {
          id: typeof info.ClientId === 'string' ? info.ClientId : ctx.output.environment,
          name:
            typeof info.ClientName === 'string'
              ? info.ClientName
              : `PowerOffice ${ctx.output.environment}`,
          environment: ctx.output.environment,
          activeClientSubscriptions: info.ActiveClientSubscriptions,
          validPrivileges: info.ValidPrivileges,
          invalidPrivileges: info.InvalidPrivileges
        }
      };
    }
  });
