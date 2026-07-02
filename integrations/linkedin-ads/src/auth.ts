import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

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
    name: 'LinkedIn OAuth',
    key: 'linkedin_oauth',

    scopes: [
      {
        title: 'Read Ads',
        description: 'Retrieve advertising accounts and their data',
        scope: 'r_ads'
      },
      {
        title: 'Read Ads Reporting',
        description: 'Retrieve reporting data for advertising accounts',
        scope: 'r_ads_reporting'
      },
      {
        title: 'Read/Write Ads',
        description: "Manage and read an authenticated member's ad accounts",
        scope: 'rw_ads'
      },
      {
        title: 'Read Basic Profile',
        description: 'Access basic profile information (name, photo, headline)',
        scope: 'r_basicprofile'
      },
      {
        title: 'Read Organization Admin',
        description: 'Retrieve organization pages and reporting data',
        scope: 'r_organization_admin'
      },
      {
        title: 'Read Organization Social',
        description: 'Retrieve organization posts and engagement data',
        scope: 'r_organization_social'
      },
      {
        title: 'Read/Write Organization Admin',
        description: 'Manage organization pages and retrieve reporting data',
        scope: 'rw_organization_admin'
      },
      {
        title: 'Write Member Social',
        description: "Post, comment, and like posts on the member's behalf",
        scope: 'w_member_social'
      },
      {
        title: 'Write Organization Social',
        description: "Post, comment, and like posts on the organization's behalf",
        scope: 'w_organization_social'
      },
      {
        title: 'Read 1st Connections Size',
        description: 'Retrieve the number of 1st-degree connections',
        scope: 'r_1st_connections_size'
      },
      {
        title: 'Read/Write DMP Segments',
        description: 'Manage matched audiences and DMP segments (requires separate approval)',
        scope: 'rw_dmp_segments'
      },
      {
        title: 'Read/Write Conversions',
        description:
          'Manage conversion rules and send conversion events (requires separate approval)',
        scope: 'rw_conversions'
      },
      {
        title: 'Read Marketing Lead Gen Automation',
        description:
          'Access Lead Sync API for lead gen form submissions (requires separate approval)',
        scope: 'r_marketing_leadgen_automation'
      },
      {
        title: 'OpenID',
        description: 'OpenID Connect for user profile access',
        scope: 'openid'
      },
      {
        title: 'Profile',
        description: 'Access user profile information',
        scope: 'profile'
      },
      {
        title: 'Email',
        description: 'Access user email address',
        scope: 'email'
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
        url: `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios({});

      let response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

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

      let axios = createAxios({});

      let response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
      };

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://api.linkedin.com'
      });

      let response = await axios.get('/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`
        }
      });

      let data = response.data as {
        sub: string;
        name?: string;
        email?: string;
        picture?: string;
      };

      return {
        profile: {
          id: data.sub,
          name: data.name,
          email: data.email,
          imageUrl: data.picture
        }
      };
    }
  });
