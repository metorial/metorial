import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { createSonarQubeClient, type SonarConfig } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('SonarQube bearer token for Web API requests.')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    docs: [
      {
        type: 'docs.auth.token',
        name: 'SonarQube Server Web API authentication',
        url: 'https://docs.sonarsource.com/sonarqube-server/extension-guide/web-api/'
      },
      {
        type: 'docs.auth.token',
        name: 'SonarQube Cloud Web API authentication',
        url: 'https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/web-api/'
      }
    ],
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe('SonarQube Server or SonarQube Cloud token used as a bearer token.')
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token
      }
    }),
    getProfile: async (ctx: { output: { token: string }; config?: SonarConfig }) => {
      if (!ctx.config) {
        throw createApiServiceError(
          'SonarQube config is required before validating credentials.',
          { reason: 'sonarqube_validation_error' }
        );
      }

      let client = createSonarQubeClient({
        auth: ctx.output,
        config: ctx.config
      });
      await client.validateAuthentication();

      let deployment = ctx.config.deployment ?? 'server';
      let serverVersion =
        deployment === 'server' ? await client.getServerVersion() : undefined;
      let profileId =
        deployment === 'cloud'
          ? `cloud:${ctx.config.cloudRegion ?? 'eu'}:${ctx.config.organization ?? 'unknown'}`
          : ctx.config.serverBaseUrl;

      return {
        profile: {
          id: profileId ?? 'sonarqube',
          name:
            deployment === 'cloud'
              ? `SonarQube Cloud${ctx.config.organization ? ` (${ctx.config.organization})` : ''}`
              : `SonarQube Server${serverVersion ? ` ${serverVersion}` : ''}`,
          deployment,
          organization: ctx.config.organization,
          serverVersion,
          tokenExpiresAt: client.lastTokenExpiration
        }
      };
    }
  });
