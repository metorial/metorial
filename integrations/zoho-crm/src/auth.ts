import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_CRM_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Modules',
    description: 'Create, read, update, and delete CRM records, notes, and attachments',
    scope: 'ZohoCRM.modules.ALL'
  },

  {
    title: 'Settings',
    description:
      'Read CRM metadata including fields, layouts, custom views, related lists, and tags',
    scope: 'ZohoCRM.settings.ALL'
  },

  {
    title: 'Notifications',
    description: 'Create, read, update, and delete notification subscriptions',
    scope: 'ZohoCRM.notifications.ALL'
  },

  {
    title: 'Users',
    description: 'Read CRM users',
    scope: 'ZohoCRM.users.READ'
  },

  {
    title: 'Organization',
    description: 'Read CRM organization details',
    scope: 'ZohoCRM.org.READ'
  },

  {
    title: 'COQL',
    description: 'Execute COQL queries',
    scope: 'ZohoCRM.coql.READ'
  },

  {
    title: 'Secure Search',
    description: 'Search CRM records',
    scope: 'ZohoSearch.securesearch.READ'
  },

  {
    title: 'Send Mail',
    description: 'Send email from CRM records',
    scope: 'ZohoCRM.send_mail.all.CREATE'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'uk'] as const;
type ZohoCrmProfileContext = { output: { token: string; apiDomain: string } };

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_CRM_API_ORIGINS.us],
    eu: [ZOHO_CRM_API_ORIGINS.eu],
    in: [ZOHO_CRM_API_ORIGINS.in],
    au: [ZOHO_CRM_API_ORIGINS.au],
    jp: [ZOHO_CRM_API_ORIGINS.jp],
    ca: [ZOHO_CRM_API_ORIGINS.ca],
    sa: [ZOHO_CRM_API_ORIGINS.sa],
    uk: [ZOHO_CRM_API_ORIGINS.uk]
  },
  profile: async (ctx: ZohoCrmProfileContext) => {
    let response = await createAxios({
      baseURL: `${ctx.output.apiDomain}/crm/v8`,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/users', { params: { type: 'CurrentUser' } });
    let user = response.data?.users?.[0];

    return {
      id: user?.id,
      email: user?.email,
      name: user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
      imageUrl: user?.image_link,
      role: user?.role?.name,
      profileName: user?.profile?.name
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
