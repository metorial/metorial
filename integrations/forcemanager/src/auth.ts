import crypto from 'crypto';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'API Key (HMAC)',
    key: 'hmac_api_key',

    inputSchema: z.object({
      publicKey: z.string().describe('ForceManager API Public Key'),
      privateKey: z.string().describe('ForceManager API Private Key')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: '',
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey,
          authMethod: 'hmac' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let ax = createAxios({ baseURL: 'https://api.forcemanager.com/api/v4' });
      let timestamp = Math.floor(Date.now() / 1000).toString();
      let signature = crypto
        .createHash('sha1')
        .update(timestamp + ctx.output.publicKey + ctx.output.privateKey)
        .digest('hex');

      let response = await ax.get('/users', {
        headers: {
          'X-FM-PublicKey': ctx.output.publicKey,
          'X-FM-UnixTimestamp': timestamp,
          'X-FM-Signature': signature,
          'X-FM-API-Version': '4'
        },
        params: { count: 1 }
      });

      let user =
        Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;

      return {
        profile: {
          id: user?.id?.toString(),
          name: user ? `${user.name || ''} ${user.lastName || ''}`.trim() : undefined,
          email: user?.email
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Session Key',
    key: 'session_key',

    inputSchema: z.object({
      publicKey: z.string().describe('ForceManager API Public Key (username)'),
      privateKey: z.string().describe('ForceManager API Private Key (password)')
    }),

    getOutput: async ctx => {
      let ax = createAxios({ baseURL: 'https://api.forcemanager.com/api/v4' });

      let response = await ax.post('/login', {
        username: ctx.input.publicKey,
        password: ctx.input.privateKey
      });

      let sessionKey = response.data?.token || response.data?.sessionKey || response.data;

      return {
        output: {
          token: typeof sessionKey === 'string' ? sessionKey : JSON.stringify(sessionKey),
          publicKey: ctx.input.publicKey,
          privateKey: ctx.input.privateKey,
          authMethod: 'session_key' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let ax = createAxios({ baseURL: 'https://api.forcemanager.com/api/v4' });

      let response = await ax.get('/users', {
        headers: {
          'X-Session-Key': ctx.output.token,
          'X-FM-API-Version': '4'
        },
        params: { count: 1 }
      });

      let user =
        Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null;

      return {
        profile: {
          id: user?.id?.toString(),
          name: user ? `${user.name || ''} ${user.lastName || ''}`.trim() : undefined,
          email: user?.email
        }
      };
    }
  });
