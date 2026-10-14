import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, getEmployeeRecord } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your DeskTime API key. Get it from https://desktime.com/app/api or Settings > API in the DeskTime web app.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      let employee = getEmployeeRecord(
        await new Client({ token: ctx.output.token }).getCurrentUser()
      );
      if (typeof employee.id !== 'string' && typeof employee.id !== 'number') {
        throw createApiServiceError(
          "DeskTime did not return the API key owner's employee ID.",
          {
            reason: 'desktime_invalid_response'
          }
        );
      }
      return {
        profile: {
          id: String(employee.id),
          name: typeof employee.name === 'string' ? employee.name : undefined,
          email: typeof employee.email === 'string' ? employee.email : undefined
        }
      };
    }
  });
