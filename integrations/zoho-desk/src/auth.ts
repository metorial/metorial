import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_DESK_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Tickets',
    description:
      'Create, read, update, and delete tickets, comments, threads, and time entries',
    scope: 'Desk.tickets.ALL'
  },

  {
    title: 'Contacts',
    description: 'Create, read, update, and delete contacts and accounts',
    scope: 'Desk.contacts.ALL'
  },

  {
    title: 'Tasks',
    description: 'Create, read, update, and delete tasks',
    scope: 'Desk.tasks.ALL'
  },

  {
    title: 'Events',
    description: 'Create and delete webhook subscriptions',
    scope: 'Desk.events.ALL'
  },

  {
    title: 'Articles',
    description: 'Create, read, update, and delete knowledge base articles',
    scope: 'Desk.articles.ALL'
  },

  {
    title: 'Basic',
    description:
      'Read the authenticated profile, agents, departments, and knowledge base categories',
    scope: 'Desk.basic.READ'
  },

  {
    title: 'Search',
    description: 'Search tickets, contacts, and accounts',
    scope: 'Desk.search.READ'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au'] as const;
type ZohoDeskProfileContext = { output: { token: string; apiDomain: string } };

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_DESK_API_ORIGINS.us],
    eu: [ZOHO_DESK_API_ORIGINS.eu],
    in: [ZOHO_DESK_API_ORIGINS.in],
    au: [ZOHO_DESK_API_ORIGINS.au]
  },
  profile: async (ctx: ZohoDeskProfileContext) => {
    let response = await createAxios({
      baseURL: ctx.output.apiDomain,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/api/v1/myinfo');
    let profile = response.data;

    return {
      id: profile.id,
      email: profile.emailId,
      name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
      imageUrl: profile.photoURL
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
