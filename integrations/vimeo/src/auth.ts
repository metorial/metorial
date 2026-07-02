import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.vimeo.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Public',
        description: 'Access to public video metadata and user information',
        scope: 'public'
      },
      {
        title: 'Private',
        description: 'Access to private user data and videos',
        scope: 'private'
      },
      {
        title: 'Upload',
        description: 'Ability to upload videos',
        scope: 'upload'
      },
      {
        title: 'Edit',
        description: 'Ability to edit video metadata and settings',
        scope: 'edit'
      },
      {
        title: 'Delete',
        description: 'Ability to delete videos',
        scope: 'delete'
      },
      {
        title: 'Interact',
        description: 'Allows liking, commenting, and following users',
        scope: 'interact'
      },
      {
        title: 'Purchased',
        description: 'Access to purchased content',
        scope: 'purchased'
      },
      {
        title: 'Create',
        description: 'Ability to create resources like albums, channels, etc.',
        scope: 'create'
      },
      {
        title: 'Video Files',
        description: 'Access to video file links (may require Pro or higher plan)',
        scope: 'video_files'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://api.vimeo.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await api.post(
        '/oauth/access_token',
        {
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response = await api.post(
        '/oauth/access_token',
        {
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        },
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/json'
          }
        }
      );

      let data = response.data;

      let expiresAt: string | undefined;
      if (data.expires_in) {
        expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.uri?.replace('/users/', ''),
          name: user.name,
          email: user.email,
          imageUrl: user.pictures?.sizes?.[user.pictures.sizes.length - 1]?.link
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z
        .string()
        .describe('Personal Access Token generated from the Vimeo developer portal')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: any) => {
      let response = await api.get('/me', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let user = response.data;

      return {
        profile: {
          id: user.uri?.replace('/users/', ''),
          name: user.name,
          email: user.email,
          imageUrl: user.pictures?.sizes?.[user.pictures.sizes.length - 1]?.link
        }
      };
    }
  });
