import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string(), apiVersion: z.enum(['v2', 'v3']).optional() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'Legacy API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Legacy v2 account API key, or account read-only key for read operations. Find it under Integrations & API in your dashboard. Use this connection for alert contacts, status pages, maintenance windows and the legacy monitor tools.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      await new Client({ token, apiVersion: 'v2' }).getAccountDetails();
      return { output: { token, apiVersion: 'v2' as const } };
    },
    getProfile: async (ctx: { output: { token: string; apiVersion?: 'v2' | 'v3' } }) => {
      let account = await new Client(ctx.output).getAccountDetails();
      return { profile: { email: account.email, name: account.email } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Current API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Current v3 account API token, or account read-only token for reads. Find it under Integrations & API in your dashboard. Use this connection for Who Am I, List Current Monitors, Get Monitor, Manage Monitor and List Incidents.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiToken.trim();
      await new Client({ token, apiVersion: 'v3' }).whoAmI();
      return { output: { token, apiVersion: 'v3' as const } };
    },
    getProfile: async (ctx: { output: { token: string; apiVersion?: 'v2' | 'v3' } }) => {
      let user = await new Client(ctx.output).whoAmI();
      return { profile: { email: user.email, name: user.fullName || user.email } };
    }
  });
