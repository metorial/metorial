import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_BIGIN_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Modules',
    description: 'Create, read, update, and delete module records, related records, and notes',
    scope: 'ZohoBigin.modules.ALL'
  },

  {
    title: 'Settings',
    description: 'Read metadata and manage tag definitions',
    scope: 'ZohoBigin.settings.ALL'
  },

  {
    title: 'Users',
    description: 'Read organization users',
    scope: 'ZohoBigin.users.READ'
  },

  {
    title: 'Notifications',
    description: 'Manage webhook notification subscriptions',
    scope: 'ZohoBigin.notifications.ALL'
  },
  {
    title: 'Secure Search',
    description: 'Search Bigin records',
    scope: 'ZohoSearch.securesearch.READ'
  },
  {
    title: 'Search Contacts',
    description: 'Read contacts returned by record search',
    scope: 'ZohoBigin.modules.contacts.READ'
  },
  {
    title: 'Search Accounts',
    description: 'Read accounts returned by record search',
    scope: 'ZohoBigin.modules.accounts.READ'
  },
  {
    title: 'Search Pipelines',
    description: 'Read pipelines returned by record search',
    scope: 'ZohoBigin.modules.pipelines.READ'
  },
  {
    title: 'Search Products',
    description: 'Read products returned by record search',
    scope: 'ZohoBigin.modules.products.READ'
  },
  {
    title: 'Search Tasks',
    description: 'Read tasks returned by record search',
    scope: 'ZohoBigin.modules.tasks.READ'
  },
  {
    title: 'Search Events',
    description: 'Read events returned by record search',
    scope: 'ZohoBigin.modules.events.READ'
  },
  {
    title: 'Search Calls',
    description: 'Read calls returned by record search',
    scope: 'ZohoBigin.modules.calls.READ'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa'] as const;
type ZohoBiginProfileContext = { output: { token: string; apiDomain: string } };

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_BIGIN_API_ORIGINS.us],
    eu: [ZOHO_BIGIN_API_ORIGINS.eu],
    in: [ZOHO_BIGIN_API_ORIGINS.in],
    au: [ZOHO_BIGIN_API_ORIGINS.au],
    jp: [ZOHO_BIGIN_API_ORIGINS.jp],
    ca: [ZOHO_BIGIN_API_ORIGINS.ca],
    sa: [ZOHO_BIGIN_API_ORIGINS.sa]
  },
  profile: async (ctx: ZohoBiginProfileContext) => {
    let response = await createAxios({
      baseURL: `${ctx.output.apiDomain}/bigin/v2`,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/users', { params: { type: 'CurrentUser' } });
    let user = response.data?.users?.[0];

    return {
      id: user?.id,
      email: user?.email,
      name: user?.full_name
    };
  }
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      applicationType: z.enum(['multi_dc', 'regional']),
      region: z.enum(supportedRegions),
      accountsUrl: z.string(),
      apiDomain: z.string()
    })
  )
  .addOauth(oauth);
