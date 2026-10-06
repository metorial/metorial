import { SlateAuth } from 'slates';
import { z } from 'zod';
import { fail, sid } from './lib/validation';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded credentials for HTTP Basic Auth'),
      accountSid: z.string().describe('Twilio Account SID'),
      credentialMode: z.enum(['account_credentials', 'api_key']).optional(),
      region: z.literal('us1').optional()
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
      sid(ctx.input.accountSid, 'AC', 'Account SID');
      if (!ctx.input.authToken || /[\r\n]/.test(ctx.input.authToken))
        throw fail('Provide a valid account Auth Token.');
      let credentials = Buffer.from(
        `${ctx.input.accountSid}:${ctx.input.authToken}`,
        'utf8'
      ).toString('base64');
      return {
        output: {
          token: credentials,
          accountSid: ctx.input.accountSid,
          credentialMode: 'account_credentials' as const,
          region: 'us1' as const
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
      sid(ctx.input.accountSid, 'AC', 'Account SID');
      sid(ctx.input.apiKey, 'SK', 'API Key SID');
      if (!ctx.input.apiSecret || /[\r\n]/.test(ctx.input.apiSecret))
        throw fail('Provide a valid API Key Secret.');
      let credentials = Buffer.from(
        `${ctx.input.apiKey}:${ctx.input.apiSecret}`,
        'utf8'
      ).toString('base64');
      return {
        output: {
          token: credentials,
          accountSid: ctx.input.accountSid,
          credentialMode: 'api_key' as const,
          region: 'us1' as const
        }
      };
    }
  });
