import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_MAIL_API_ORIGINS, ZOHO_MAIL_OAUTH_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Messages',
    description: 'Send, read, update, and delete email messages',
    scope: 'ZohoMail.messages.ALL'
  },

  {
    title: 'Accounts',
    description: 'Read user email accounts',
    scope: 'ZohoMail.accounts.READ'
  },

  {
    title: 'Folders',
    description: 'Create, read, update, and delete email folders',
    scope: 'ZohoMail.folders.ALL'
  },

  {
    title: 'Labels',
    description: 'Create, read, update, and delete email labels',
    scope: 'ZohoMail.tags.ALL'
  },

  {
    title: 'Tasks',
    description: 'Create, read, update, and delete personal and group tasks',
    scope: 'ZohoMail.tasks.ALL'
  },

  {
    title: 'Notes',
    description: 'Create, read, update, and delete personal and group notes',
    scope: 'ZohoMail.notes.ALL'
  },

  {
    title: 'Bookmarks',
    description: 'Create, read, update, and delete personal and group bookmarks',
    scope: 'ZohoMail.links.ALL'
  },

  {
    title: 'Organization Accounts',
    description: 'Read organization user accounts',
    scope: 'ZohoMail.organization.accounts.READ'
  },

  {
    title: 'Organization Domains',
    description: 'Read organization domains',
    scope: 'ZohoMail.organization.domains.READ'
  },

  {
    title: 'Organization Groups',
    description: 'Read organization groups',
    scope: 'ZohoMail.organization.groups.READ'
  },

  {
    title: 'Organization Subscriptions',
    description: 'Read organization storage and subscription details',
    scope: 'ZohoMail.organization.subscriptions.READ'
  },

  {
    title: 'Partner Organization',
    description: 'Read organization details',
    scope: 'ZohoMail.partner.organization.READ'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp'] as const;
type ZohoMailRegion = (typeof supportedRegions)[number];
type ZohoMailHookContext = {
  output: { token: string; region: ZohoMailRegion };
};

let getPrimaryMailAccount = async (ctx: ZohoMailHookContext) => {
  let response = await createAxios({
    baseURL: ZOHO_MAIL_API_ORIGINS[ctx.output.region],
    headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
  }).get('/api/accounts');

  return response.data?.data?.[0];
};

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_MAIL_OAUTH_API_ORIGINS.us],
    eu: [ZOHO_MAIL_OAUTH_API_ORIGINS.eu],
    in: [ZOHO_MAIL_OAUTH_API_ORIGINS.in],
    au: [ZOHO_MAIL_OAUTH_API_ORIGINS.au],
    jp: [ZOHO_MAIL_OAUTH_API_ORIGINS.jp]
  },
  extendOutput: async (ctx: ZohoMailHookContext) => {
    try {
      let account = await getPrimaryMailAccount(ctx);
      return account?.accountId ? { accountId: String(account.accountId) } : undefined;
    } catch {
      return undefined;
    }
  },
  profile: async (ctx: ZohoMailHookContext) => {
    let account = await getPrimaryMailAccount(ctx);

    return {
      id: account?.accountId ? String(account.accountId) : undefined,
      email: account?.emailAddress?.[0]?.mailId || account?.primaryEmailAddress,
      name: [account?.firstName, account?.lastName].filter(Boolean).join(' ') || undefined
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
      apiDomain: z.string(),
      accountId: z.string().optional().describe('Primary Zoho Mail account ID')
    })
  )
  .addOauth(oauth);
