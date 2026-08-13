import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_API_ORIGINS } from './lib/urls';

let scopes = [
  // CRM
  {
    title: 'CRM - Modules',
    description: 'Create, read, update, and delete CRM records',
    scope: 'ZohoCRM.modules.ALL'
  },

  {
    title: 'CRM - Settings',
    description: 'Read CRM module and field metadata',
    scope: 'ZohoCRM.settings.ALL'
  },

  {
    title: 'CRM - Notifications',
    description: 'Manage CRM notification subscriptions',
    scope: 'ZohoCRM.notifications.ALL'
  },

  {
    title: 'CRM - COQL',
    description: 'Execute COQL queries against CRM data',
    scope: 'ZohoCRM.coql.READ'
  },

  {
    title: 'CRM - Secure Search',
    description: 'Search CRM records',
    scope: 'ZohoSearch.securesearch.READ'
  },

  {
    title: 'CRM - Users',
    description: 'Read CRM user information',
    scope: 'ZohoCRM.users.READ'
  },

  // Desk
  {
    title: 'Desk - Tickets',
    description: 'Create, read, update, and delete support tickets',
    scope: 'Desk.tickets.ALL'
  },

  {
    title: 'Desk - Contacts',
    description: 'Create, read, update, and delete Desk contacts',
    scope: 'Desk.contacts.ALL'
  },

  {
    title: 'Desk - Basic',
    description: 'Read Desk departments and basic organization data',
    scope: 'Desk.basic.READ'
  },

  {
    title: 'Desk - Search',
    description: 'Search across Desk resources',
    scope: 'Desk.search.READ'
  },

  // Books
  {
    title: 'Books - Full Access',
    description: 'Retained pending verification of product-wide scope coverage',
    scope: 'ZohoBooks.fullaccess.all'
  },
  {
    title: 'Books - Invoices',
    description: 'Access invoices',
    scope: 'ZohoBooks.invoices.ALL'
  },
  {
    title: 'Books - Contacts',
    description: 'Access customers and vendors',
    scope: 'ZohoBooks.contacts.ALL'
  },
  {
    title: 'Books - Expenses',
    description: 'Access expenses',
    scope: 'ZohoBooks.expenses.ALL'
  },
  {
    title: 'Books - Settings',
    description: 'Read organizations and settings',
    scope: 'ZohoBooks.settings.READ'
  },

  // People
  {
    title: 'People - Forms',
    description: 'Create, read, update, and delete Zoho People form records',
    scope: 'ZOHOPEOPLE.forms.ALL'
  },

  {
    title: 'People - Attendance',
    description: 'Read attendance records',
    scope: 'ZOHOPEOPLE.attendance.READ'
  },

  {
    title: 'People - Leave',
    description: 'Read leave types',
    scope: 'ZOHOPEOPLE.leave.READ'
  },

  // Projects
  {
    title: 'Projects - Portals',
    description: 'Read Zoho Projects portals',
    scope: 'ZohoProjects.portals.READ'
  },

  {
    title: 'Projects - Projects',
    description: 'Create, read, update, and delete projects',
    scope: 'ZohoProjects.projects.ALL'
  },

  {
    title: 'Projects - Tasks',
    description: 'Create, read, update, and delete tasks',
    scope: 'ZohoProjects.tasks.ALL'
  },

  {
    title: 'Projects - Milestones',
    description: 'Read project milestones',
    scope: 'ZohoProjects.milestones.READ'
  },

  // Profile
  {
    title: 'Profile',
    description: 'Read the authenticated user profile',
    scope: 'AaaServer.profile.READ'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa', 'uk'] as const;
type ZohoProfileContext = { output: { token: string; accountsUrl: string } };

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_API_ORIGINS.us],
    eu: [ZOHO_API_ORIGINS.eu],
    in: [ZOHO_API_ORIGINS.in],
    au: [ZOHO_API_ORIGINS.au],
    jp: [ZOHO_API_ORIGINS.jp],
    ca: [ZOHO_API_ORIGINS.ca],
    sa: [ZOHO_API_ORIGINS.sa],
    uk: [ZOHO_API_ORIGINS.uk]
  },
  profile: async (ctx: ZohoProfileContext) => {
    let response = await createAxios({
      baseURL: ctx.output.accountsUrl,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/oauth/user/info');
    let data = response.data;

    return {
      id: data.ZUID?.toString(),
      email: data.Email,
      name: data.Display_Name || `${data.First_Name || ''} ${data.Last_Name || ''}`.trim()
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
