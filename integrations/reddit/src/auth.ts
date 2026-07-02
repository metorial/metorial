import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { REDDIT_USER_AGENT } from './lib/client';
import { redditApiError } from './lib/errors';

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
        title: 'Identity',
        description: 'Access your reddit username and signup date',
        scope: 'identity'
      },
      {
        title: 'Edit',
        description: 'Edit and delete your comments and submissions',
        scope: 'edit'
      },
      {
        title: 'Flair',
        description: 'Select your user flair and manage link flair in subreddits you moderate',
        scope: 'flair'
      },
      {
        title: 'History',
        description:
          "Access your voting history and comments/submissions you've saved or hidden",
        scope: 'history'
      },
      {
        title: 'Mod Config',
        description: 'Manage the configuration, sidebar, and CSS of subreddits you moderate',
        scope: 'modconfig'
      },
      {
        title: 'Mod Flair',
        description: 'Manage and assign flair in subreddits you moderate',
        scope: 'modflair'
      },
      {
        title: 'Mod Log',
        description: 'Access the moderation log in subreddits you moderate',
        scope: 'modlog'
      },
      {
        title: 'Mod Posts',
        description:
          'Approve, remove, mark NSFW, and distinguish content in subreddits you moderate',
        scope: 'modposts'
      },
      {
        title: 'Mod Wiki',
        description: 'Change editors and visibility of wiki pages in subreddits you moderate',
        scope: 'modwiki'
      },
      {
        title: 'My Subreddits',
        description: 'Access the list of subreddits you subscribe to and moderate',
        scope: 'mysubreddits'
      },
      {
        title: 'Private Messages',
        description: 'Access your inbox and send private messages',
        scope: 'privatemessages'
      },
      {
        title: 'Read',
        description: 'Access posts, comments, and listings across Reddit',
        scope: 'read'
      },
      {
        title: 'Report',
        description: 'Report content for rules violations',
        scope: 'report'
      },
      {
        title: 'Save',
        description: 'Save and unsave comments and submissions',
        scope: 'save'
      },
      {
        title: 'Submit',
        description: 'Submit links and comments from your account',
        scope: 'submit'
      },
      {
        title: 'Subscribe',
        description: 'Manage your subreddit subscriptions and friends',
        scope: 'subscribe'
      },
      {
        title: 'Vote',
        description: 'Submit and change your votes on comments and submissions',
        scope: 'vote'
      },
      {
        title: 'Wiki Edit',
        description: 'Edit wiki pages on your behalf',
        scope: 'wikiedit'
      },
      {
        title: 'Wiki Read',
        description: 'Read wiki pages through your account',
        scope: 'wikiread'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        state: ctx.state,
        redirect_uri: ctx.redirectUri,
        duration: 'permanent',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://www.reddit.com/api/v1/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let http = createAxios();

      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri
      });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await http.post(
          'https://www.reddit.com/api/v1/access_token',
          params.toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': REDDIT_USER_AGENT
            }
          }
        );
      } catch (error) {
        throw redditApiError(error, 'OAuth callback');
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: expiresAtFromSeconds(data.expires_in)
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        return { output: ctx.output };
      }

      let http = createAxios();

      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await http.post(
          'https://www.reddit.com/api/v1/access_token',
          params.toString(),
          {
            headers: {
              Authorization: `Basic ${credentials}`,
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': REDDIT_USER_AGENT
            }
          }
        );
      } catch (error) {
        throw redditApiError(error, 'OAuth token refresh');
      }

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token ?? ctx.output.refreshToken,
          expiresAt: expiresAtFromSeconds(data.expires_in)
        }
      };
    },

    getProfile: async (ctx: any) => {
      let http = createAxios({
        baseURL: 'https://oauth.reddit.com',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'User-Agent': REDDIT_USER_AGENT
        }
      });

      let response: any;
      try {
        response = await http.get('/api/v1/me');
      } catch (error) {
        throw redditApiError(error, 'profile lookup');
      }
      let user = response.data;

      return {
        profile: {
          id: user.id,
          name: user.name,
          imageUrl: user.icon_img?.split('?')[0]
        }
      };
    }
  });

let expiresAtFromSeconds = (expiresIn: unknown) => {
  let seconds = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  return new Date(Date.now() + seconds * 1000).toISOString();
};
