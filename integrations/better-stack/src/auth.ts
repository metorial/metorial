import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let outputSchema = z.object({
  token: z.string(),
  tokenType: z.enum(['uptime', 'telemetry', 'global']).describe('Type of API token being used')
});

type AuthOutput = z.infer<typeof outputSchema>;

export let auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'Uptime API Token',
    key: 'uptime_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Uptime API token (team-scoped)')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        tokenType: 'uptime' as const
      }
    }),
    getProfile: async (ctx: { output: AuthOutput; input: { token: string } }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://uptime.betterstack.com/api/v2',
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });
      try {
        await axiosInstance.get('/monitors', { params: { per_page: 1 } });
        return {
          profile: {
            name: 'Better Stack Uptime',
            tokenType: 'uptime'
          }
        };
      } catch {
        return {
          profile: {
            name: 'Better Stack Uptime',
            tokenType: 'uptime'
          }
        };
      }
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Telemetry API Token',
    key: 'telemetry_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Telemetry API token (team-scoped)')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        tokenType: 'telemetry' as const
      }
    }),
    getProfile: async (_ctx: { output: AuthOutput; input: { token: string } }) => {
      return {
        profile: {
          name: 'Better Stack Telemetry',
          tokenType: 'telemetry'
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Global API Token',
    key: 'global_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Global API token (valid across all teams)')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        tokenType: 'global' as const
      }
    }),
    getProfile: async (_ctx: { output: AuthOutput; input: { token: string } }) => {
      return {
        profile: {
          name: 'Better Stack (Global)',
          tokenType: 'global'
        }
      };
    }
  });
