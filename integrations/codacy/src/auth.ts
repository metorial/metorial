import { buildApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { requireCodacyNumber, requireCodacyString } from './lib/helpers';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Account API Token',
    key: 'account_api_token',
    inputSchema: z.object({
      baseUrl: z
        .string()
        .optional()
        .describe(
          'Codacy API base URL. Defaults to https://app.codacy.com/api/v3. For a self-hosted instance, use https://your-instance.example.com/api/v3.'
        ),
      apiToken: z
        .string()
        .describe(
          'Codacy Account API Token. Generate one from your Codacy account under Account > Access management > Create API token.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiToken,
          baseUrl: ctx.input.baseUrl ?? 'https://app.codacy.com/api/v3'
        }
      };
    },
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      let client = createAxios({
        baseURL: ctx.output.baseUrl ?? 'https://app.codacy.com/api/v3',
        headers: {
          'api-token': ctx.output.token
        }
      });

      let response = await client.get('/user').catch(error => {
        throw buildApiServiceError(error, {
          providerLabel: 'Codacy',
          reason: 'codacy_api_error',
          operation: 'profile request',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          detailKeys: ['message', 'innerMessage', 'error', 'detail', 'code']
        });
      });
      let user = response.data.data ?? response.data;

      return {
        profile: {
          id: String(requireCodacyNumber(user.id, 'user.id')),
          email: requireCodacyString(user.mainEmail ?? user.email, 'user.mainEmail'),
          name: user.name ?? user.mainEmail,
          imageUrl: user.avatarUrl
        }
      };
    }
  });
