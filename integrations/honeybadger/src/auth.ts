import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Personal auth token for the Honeybadger Data API'),
      projectToken: z
        .string()
        .optional()
        .describe('Project API key for the Honeybadger Reporting API')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Auth Token',
    key: 'personal_token',
    inputSchema: z.object({
      personalAuthToken: z
        .string()
        .describe(
          'Your personal auth token found under the Authentication tab in your user settings'
        ),
      projectApiKey: z
        .string()
        .optional()
        .describe(
          'Project API key found in project settings (required for reporting errors, events, deployments, and check-in pings)'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.personalAuthToken,
          projectToken: ctx.input.projectApiKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; projectToken?: string };
      input: { personalAuthToken: string; projectApiKey?: string };
    }) => {
      let http = createAxios({
        baseURL: 'https://app.honeybadger.io/v2',
        auth: {
          username: ctx.output.token,
          password: ''
        },
        headers: {
          Accept: 'application/json'
        }
      });

      let response = await http.get('/projects');
      let projects = response.data?.results || [];

      return {
        profile: {
          name: 'Honeybadger User',
          projectCount: projects.length
        }
      };
    }
  });
