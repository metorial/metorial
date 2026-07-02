import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      workspaceId: z.string().optional(),
      workspaceName: z.string().optional(),
      botId: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.notion.com/docs/create-a-notion-integration'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.notion.com/reference/capabilities'
      }
    ],

    scopes: [
      {
        title: 'Read Content',
        description: 'Read existing content in the Notion workspace',
        scope: 'read_content'
      },
      {
        title: 'Update Content',
        description: 'Update existing content in the Notion workspace',
        scope: 'update_content'
      },
      {
        title: 'Insert Content',
        description: 'Create new content in the Notion workspace',
        scope: 'insert_content'
      },
      {
        title: 'Read Comments',
        description: 'Read comments from pages and blocks',
        scope: 'read_comments'
      },
      {
        title: 'Insert Comments',
        description: 'Add comments to pages and discussion threads',
        scope: 'insert_comments'
      },
      {
        title: 'Read User Info',
        description: 'Read user information including email addresses',
        scope: 'read_user_with_email'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        owner: 'user',
        state: ctx.state
      });

      return {
        url: `https://api.notion.com/v1/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await axios.post(
        'https://api.notion.com/v1/oauth/token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? undefined,
          workspaceId: data.workspace_id ?? undefined,
          workspaceName: data.workspace_name ?? undefined,
          botId: data.bot_id ?? undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let axios = createAxios();
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await axios.post(
        'https://api.notion.com/v1/oauth/token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          }
        }
      );

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          workspaceId: data.workspace_id ?? ctx.output.workspaceId,
          workspaceName: data.workspace_name ?? ctx.output.workspaceName,
          botId: data.bot_id ?? ctx.output.botId
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.notion.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      let response = await axios.get('/users/me');
      let bot = response.data;

      return {
        profile: {
          id: bot.id,
          name: bot.name ?? ctx.output.workspaceName ?? undefined,
          imageUrl: bot.avatar_url ?? undefined,
          workspaceId: ctx.output.workspaceId,
          workspaceName: ctx.output.workspaceName
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Internal Integration Token',
    key: 'internal_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Internal Integration Token from your Notion integration settings')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.notion.com/v1',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Notion-Version': '2022-06-28'
        }
      });

      let response = await axios.get('/users/me');
      let bot = response.data;

      return {
        profile: {
          id: bot.id,
          name: bot.name ?? undefined,
          imageUrl: bot.avatar_url ?? undefined
        }
      };
    }
  });
