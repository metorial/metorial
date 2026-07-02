import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your dbt Cloud Personal Access Token. Created under Account Settings > API Tokens > Personal Tokens.'
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
    name: 'Service Account Token',
    key: 'service_account_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your dbt Cloud Service Account Token. Created under Account Settings > Service Tokens.'
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
