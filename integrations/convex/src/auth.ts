import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['deploy_key', 'oauth']).describe('The type of authentication used')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Deploy Key',
    key: 'deploy_key',
    inputSchema: z.object({
      deployKey: z
        .string()
        .describe('Convex deploy key from the dashboard deployment settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.deployKey,
          authType: 'deploy_key' as const
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    scopes: [
      {
        title: 'Team Access',
        description:
          'Create and manage projects, deployments, and access all projects on the team',
        scope: 'team'
      },
      {
        title: 'Project Access',
        description: 'Create deployments and access data/functions within a specific project',
        scope: 'project'
      }
    ],
    inputSchema: z.object({
      scopeLevel: z
        .enum(['team', 'project'])
        .default('team')
        .describe('Whether to authorize at team or project level')
    }),
    getAuthorizationUrl: async ctx => {
      let scopeLevel = ctx.input.scopeLevel || 'team';
      let authorizePath =
        scopeLevel === 'project' ? '/oauth/authorize/project' : '/oauth/authorize/team';

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        response_type: 'code'
      });

      return {
        url: `https://dashboard.convex.dev${authorizePath}?${params.toString()}`,
        input: ctx.input
      };
    },
    handleCallback: async ctx => {
      let http = createAxios();

      let response = await http.post(
        'https://api.convex.dev/oauth/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        output: {
          token: response.data.access_token,
          authType: 'oauth' as const
        },
        input: ctx.input
      };
    }
  });
