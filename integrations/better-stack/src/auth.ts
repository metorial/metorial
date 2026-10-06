import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import type { TokenType } from './lib/api';
import { UptimeClient } from './lib/client';
import { TelemetryClient } from './lib/telemetry-client';

const outputSchema = z.object({
  token: z.string(),
  tokenType: z.enum(['uptime', 'telemetry', 'global']).describe('Type of API token being used')
});
type AuthOutput = z.infer<typeof outputSchema>;
const tokenOutput = (token: string, tokenType: TokenType) => {
  if (!token.trim()) throw createApiServiceError('Provide a nonempty Better Stack API token.');
  return { output: { token: token.trim(), tokenType } };
};
export const auth = SlateAuth.create()
  .output(outputSchema)
  .addTokenAuth({
    type: 'auth.token',
    name: 'Uptime API Token',
    key: 'uptime_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Uptime API token for one team')
    }),
    getOutput: async ctx => tokenOutput(ctx.input.token, 'uptime'),
    getProfile: async (ctx: { output: AuthOutput }) => {
      await new UptimeClient(ctx.output).listMonitors({ perPage: 1 });
      return { profile: { name: 'Better Stack Uptime', tokenType: 'uptime' } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Telemetry API Token',
    key: 'telemetry_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Telemetry API token for one team')
    }),
    getOutput: async ctx => tokenOutput(ctx.input.token, 'telemetry'),
    getProfile: async (ctx: { output: AuthOutput }) => {
      await new TelemetryClient(ctx.output).listSources({ perPage: 1 });
      return { profile: { name: 'Better Stack Telemetry', tokenType: 'telemetry' } };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Global API Token',
    key: 'global_token',
    inputSchema: z.object({
      token: z.string().describe('Better Stack Global API token across authorized teams')
    }),
    getOutput: async ctx => tokenOutput(ctx.input.token, 'global'),
    getProfile: async (ctx: { output: AuthOutput }) => {
      await new UptimeClient(ctx.output).listMonitors({ perPage: 1 });
      return { profile: { name: 'Better Stack (Global)', tokenType: 'global' } };
    }
  });
