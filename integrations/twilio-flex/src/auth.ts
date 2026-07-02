import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded credentials for HTTP Basic Auth'),
      accountSid: z.string().describe('Twilio Account SID')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Account SID + Auth Token',
    key: 'account_credentials',
    inputSchema: z.object({
      accountSid: z.string().describe('Twilio Account SID (ACxxxxx)'),
      authToken: z.string().describe('Twilio Auth Token')
    }),
    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.accountSid}:${ctx.input.authToken}`);
      return {
        output: {
          token: credentials,
          accountSid: ctx.input.accountSid
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key + Secret',
    key: 'api_key',
    inputSchema: z.object({
      accountSid: z.string().describe('Twilio Account SID (ACxxxxx)'),
      apiKey: z.string().describe('Twilio API Key SID (SKxxxxx)'),
      apiSecret: z.string().describe('Twilio API Key Secret')
    }),
    getOutput: async ctx => {
      let credentials = btoa(`${ctx.input.apiKey}:${ctx.input.apiSecret}`);
      return {
        output: {
          token: credentials,
          accountSid: ctx.input.accountSid
        }
      };
    }
  });
