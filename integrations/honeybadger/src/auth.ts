import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from './lib/client';
import type { HoneybadgerAuth } from './lib/types';

export const auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Personal Data API token'),
      projectToken: z.string().optional().describe('Project Reporting API key'),
      region: z.enum(['us', 'eu']).optional().describe('Honeybadger data region')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Auth Token',
    key: 'personal_token',
    inputSchema: z.object({
      personalAuthToken: z
        .string()
        .describe('Personal token from the Authentication tab in user settings'),
      projectApiKey: z
        .string()
        .optional()
        .describe(
          'Project API key for reporting errors and events; deployment records require the selected project’s primary key. ID-based check-in pings do not require it.'
        ),
      region: z
        .enum(['us', 'eu'])
        .optional()
        .describe(
          'Region used to sign in: us for app.honeybadger.io (default), eu for eu-app.honeybadger.io'
        )
    }),
    getOutput: async ctx => {
      const token = ctx.input.personalAuthToken.trim();
      const projectToken = ctx.input.projectApiKey?.trim();
      if (!token || (ctx.input.projectApiKey !== undefined && !projectToken))
        throw createApiServiceError(
          'Provide a nonempty personal token and, if configured, a nonempty project API key.'
        );
      return { output: { token, projectToken, region: ctx.input.region ?? 'us' } };
    },
    getProfile: async (ctx: { output: HoneybadgerAuth }) => {
      const accounts = await new HoneybadgerClient(ctx.output).listAccounts();
      return {
        profile: {
          name: `Honeybadger (${ctx.output.region === 'eu' ? 'EU' : 'US'})`,
          accountCountOnPage: accounts.results.length
        }
      };
    }
  });
