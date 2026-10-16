import { createApiServiceError, isApiErrorRecord, SlateAuth } from 'slates';
import { z } from 'zod';
import { DopplerClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe('Doppler API token (Personal, Service, or Service Account token)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiToken: string } }) => {
      let client = new DopplerClient({ token: ctx.output.token });
      try {
        let workplace = await client.getWorkplace();
        return {
          profile: {
            id: workplace.id,
            name: workplace.name,
            email: workplace.billing_email
          }
        };
      } catch (error) {
        if (
          !isApiErrorRecord(error) ||
          !isApiErrorRecord(error.data) ||
          error.data.upstreamStatus !== 403
        ) {
          throw error;
        }
        // Config-scoped tokens can lack workplace access; /me identifies the token itself.
        let token = await client.getCurrentToken();
        let workplace = isApiErrorRecord(token.workplace) ? token.workplace : undefined;
        let id = workplace?.slug ?? token.slug;
        let name = workplace?.name ?? token.name;
        if (typeof id !== 'string' || typeof name !== 'string') {
          throw createApiServiceError('Doppler did not return an identifiable token profile.');
        }
        return { profile: { id, name } };
      }
    }
  });
