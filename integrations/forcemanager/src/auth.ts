import { SlateAuth } from 'slates';
import { z } from 'zod';
import { type AuthConfig, Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      publicKey: z.string(),
      privateKey: z.string(),
      authMethod: z.enum(['hmac', 'session_key'])
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'hmac_api_key',
    inputSchema: z.object({
      publicKey: z.string().describe('ForceManager API Public Key'),
      privateKey: z.string().describe('ForceManager API Private Key')
    }),
    getOutput: async ctx => ({
      output: {
        token: await Client.login(ctx.input.publicKey, ctx.input.privateKey),
        publicKey: ctx.input.publicKey,
        privateKey: ctx.input.privateKey,
        authMethod: 'hmac' as const
      }
    }),
    getProfile: async (ctx: { output: AuthConfig }) => {
      await new Client(ctx.output).listUsers({ count: 1 });
      return { profile: { name: 'ForceManager API connection' } };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Session Key',
    key: 'session_key',
    inputSchema: z.object({
      publicKey: z.string().describe('ForceManager API Public Key (login username)'),
      privateKey: z.string().describe('ForceManager API Private Key (login password)')
    }),
    getOutput: async ctx => ({
      output: {
        token: await Client.login(ctx.input.publicKey, ctx.input.privateKey),
        publicKey: ctx.input.publicKey,
        privateKey: ctx.input.privateKey,
        authMethod: 'session_key' as const
      }
    }),
    getProfile: async (ctx: { output: AuthConfig }) => {
      await new Client(ctx.output).listUsers({ count: 1 });
      return { profile: { name: 'ForceManager API connection' } };
    }
  });
