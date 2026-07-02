import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('InVision DSM API authentication key or SCIM bearer token')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'DSM API Key',
    key: 'dsm_api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The DSM API authentication key generated from the API setup page in DSM design system settings'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'SCIM Bearer Token',
    key: 'scim_bearer_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'The SCIM provisioning bearer token generated when enabling SCIM for an Enterprise account'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
