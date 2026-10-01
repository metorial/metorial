import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_API_ORIGINS } from './lib/urls';

let scopes = [
  { title: 'Desk accounts', description: 'Manage Desk accounts', scope: 'Desk.accounts.ALL' },
  { title: 'Desk agents', description: 'Read Desk agent profiles', scope: 'Desk.agents.READ' },
  {
    title: 'CRM records',
    description: 'Access CRM records workflows',
    scope: 'ZohoCRM.modules.ALL'
  },
  {
    title: 'CRM settings',
    description: 'Access CRM settings workflows',
    scope: 'ZohoCRM.settings.ALL'
  },
  {
    title: 'CRM queries',
    description: 'Access CRM queries workflows',
    scope: 'ZohoCRM.coql.READ'
  },
  {
    title: 'CRM and Bigin search',
    description: 'Access CRM and Bigin search workflows',
    scope: 'ZohoSearch.securesearch.READ'
  },
  {
    title: 'CRM users',
    description: 'Access CRM users workflows',
    scope: 'ZohoCRM.users.READ'
  },
  {
    title: 'CRM organization',
    description: 'Access CRM organization workflows',
    scope: 'ZohoCRM.org.READ'
  },
  {
    title: 'CRM email',
    description: 'Access CRM email workflows',
    scope: 'ZohoCRM.send_mail.all.CREATE'
  },
  {
    title: 'Bigin records',
    description: 'Access Bigin records workflows',
    scope: 'ZohoBigin.modules.ALL'
  },
  {
    title: 'Bigin notes',
    description: 'Access Bigin notes workflows',
    scope: 'ZohoBigin.modules.notes.ALL'
  },
  {
    title: 'Bigin settings',
    description: 'Access Bigin settings workflows',
    scope: 'ZohoBigin.settings.ALL'
  },
  {
    title: 'Bigin users',
    description: 'Access Bigin users workflows',
    scope: 'ZohoBigin.users.READ'
  },
  {
    title: 'Books',
    description: 'Access Books workflows',
    scope: 'ZohoBooks.fullaccess.all'
  },
  {
    title: 'Inventory',
    description: 'Access Inventory workflows',
    scope: 'ZohoInventory.FullAccess.all'
  },
  {
    title: 'Invoice',
    description: 'Access Invoice workflows',
    scope: 'ZohoInvoice.fullaccess.all'
  },
  {
    title: 'People records',
    description: 'Access People records workflows',
    scope: 'ZOHOPEOPLE.forms.ALL'
  },
  {
    title: 'People forms',
    description: 'Access People forms workflows',
    scope: 'ZOHOPEOPLE.form.READ'
  },
  {
    title: 'People attendance',
    description: 'Access People attendance workflows',
    scope: 'ZOHOPEOPLE.attendance.READ'
  },
  {
    title: 'People leave',
    description: 'Access People leave workflows',
    scope: 'ZOHOPEOPLE.leave.READ'
  },
  {
    title: 'Projects portals',
    description: 'Access Projects portals workflows',
    scope: 'ZohoProjects.portals.READ'
  },
  {
    title: 'Projects',
    description: 'Access Projects workflows',
    scope: 'ZohoProjects.projects.ALL'
  },
  {
    title: 'Project tasks',
    description: 'Access Project tasks workflows',
    scope: 'ZohoProjects.tasks.ALL'
  },
  {
    title: 'Project milestones',
    description: 'Access Project milestones workflows',
    scope: 'ZohoProjects.milestones.READ'
  },
  {
    title: 'Profile',
    description: 'Access Profile workflows',
    scope: 'AaaServer.profile.READ'
  },
  {
    title: 'Desk.tickets.ALL',
    description: 'Access Desk.tickets.ALL workflows',
    scope: 'Desk.tickets.ALL'
  },
  {
    title: 'Desk.contacts.ALL',
    description: 'Access Desk.contacts.ALL workflows',
    scope: 'Desk.contacts.ALL'
  },
  {
    title: 'Desk.activities.tasks.ALL',
    description: 'Access Desk.activities.tasks.ALL workflows',
    scope: 'Desk.activities.tasks.ALL'
  },
  {
    title: 'Desk.articles.ALL',
    description: 'Access Desk.articles.ALL workflows',
    scope: 'Desk.articles.ALL'
  },
  {
    title: 'Desk.basic.READ',
    description: 'Access Desk.basic.READ workflows',
    scope: 'Desk.basic.READ'
  },
  {
    title: 'Desk.search.READ',
    description: 'Access Desk.search.READ workflows',
    scope: 'Desk.search.READ'
  },
  {
    title: 'ZohoMail.messages.ALL',
    description: 'Access ZohoMail.messages.ALL workflows',
    scope: 'ZohoMail.messages.ALL'
  },
  {
    title: 'ZohoMail.accounts.READ',
    description: 'Access ZohoMail.accounts.READ workflows',
    scope: 'ZohoMail.accounts.READ'
  },
  {
    title: 'ZohoMail.folders.ALL',
    description: 'Access ZohoMail.folders.ALL workflows',
    scope: 'ZohoMail.folders.ALL'
  },
  {
    title: 'ZohoMail.tags.ALL',
    description: 'Access ZohoMail.tags.ALL workflows',
    scope: 'ZohoMail.tags.ALL'
  },
  {
    title: 'ZohoMail.tasks.ALL',
    description: 'Access ZohoMail.tasks.ALL workflows',
    scope: 'ZohoMail.tasks.ALL'
  },
  {
    title: 'ZohoMail.notes.ALL',
    description: 'Access ZohoMail.notes.ALL workflows',
    scope: 'ZohoMail.notes.ALL'
  },
  {
    title: 'ZohoMail.links.ALL',
    description: 'Access ZohoMail.links.ALL workflows',
    scope: 'ZohoMail.links.ALL'
  },
  {
    title: 'ZohoMail.organization.accounts.READ',
    description: 'Access ZohoMail.organization.accounts.READ workflows',
    scope: 'ZohoMail.organization.accounts.READ'
  },
  {
    title: 'ZohoMail.organization.domains.READ',
    description: 'Access ZohoMail.organization.domains.READ workflows',
    scope: 'ZohoMail.organization.domains.READ'
  },
  {
    title: 'ZohoMail.organization.groups.READ',
    description: 'Access ZohoMail.organization.groups.READ workflows',
    scope: 'ZohoMail.organization.groups.READ'
  },
  {
    title: 'ZohoMail.organization.subscriptions.READ',
    description: 'Access ZohoMail.organization.subscriptions.READ workflows',
    scope: 'ZohoMail.organization.subscriptions.READ'
  },
  {
    title: 'ZohoMail.partner.organization.READ',
    description: 'Access ZohoMail.partner.organization.READ workflows',
    scope: 'ZohoMail.partner.organization.READ'
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
