import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_BOOKS_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Full Access',
    description: 'Access all Zoho Books resources',
    scope: 'ZohoBooks.fullaccess.all'
  },
  {
    title: 'Contacts',
    description: 'Access customers and vendors',
    scope: 'ZohoBooks.contacts.ALL'
  },
  {
    title: 'Settings',
    description: 'Access items, taxes, currencies, users, and organization settings',
    scope: 'ZohoBooks.settings.ALL'
  },
  {
    title: 'Invoices',
    description: 'Access invoices',
    scope: 'ZohoBooks.invoices.ALL'
  },
  {
    title: 'Estimates',
    description: 'Access estimates',
    scope: 'ZohoBooks.estimates.ALL'
  },
  {
    title: 'Customer Payments',
    description: 'Access customer payments',
    scope: 'ZohoBooks.customerpayments.ALL'
  },
  {
    title: 'Credit Notes',
    description: 'Access credit notes',
    scope: 'ZohoBooks.creditnotes.ALL'
  },
  {
    title: 'Projects',
    description: 'Access projects and time entries',
    scope: 'ZohoBooks.projects.ALL'
  },
  {
    title: 'Expenses',
    description: 'Access expenses',
    scope: 'ZohoBooks.expenses.ALL'
  },
  {
    title: 'Sales Orders',
    description: 'Access sales orders',
    scope: 'ZohoBooks.salesorders.ALL'
  },
  {
    title: 'Purchase Orders',
    description: 'Access purchase orders',
    scope: 'ZohoBooks.purchaseorders.ALL'
  },
  {
    title: 'Bills',
    description: 'Access bills',
    scope: 'ZohoBooks.bills.ALL'
  },
  {
    title: 'Vendor Payments',
    description: 'Access vendor payments',
    scope: 'ZohoBooks.vendorpayments.ALL'
  },
  {
    title: 'Banking',
    description: 'Access bank accounts and transactions',
    scope: 'ZohoBooks.banking.ALL'
  },
  {
    title: 'Accountants',
    description: 'Access chart of accounts and journals',
    scope: 'ZohoBooks.accountants.ALL'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa'] as const;
type ZohoBooksProfileContext = {
  output: { token: string; accountsUrl: string };
};

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_BOOKS_API_ORIGINS.us],
    eu: [ZOHO_BOOKS_API_ORIGINS.eu],
    in: [ZOHO_BOOKS_API_ORIGINS.in],
    au: [ZOHO_BOOKS_API_ORIGINS.au],
    jp: [ZOHO_BOOKS_API_ORIGINS.jp],
    ca: [ZOHO_BOOKS_API_ORIGINS.ca],
    sa: [ZOHO_BOOKS_API_ORIGINS.sa]
  },
  profile: async (ctx: ZohoBooksProfileContext) => {
    let response = await createAxios({
      baseURL: ctx.output.accountsUrl,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/oauth/user/info');
    let user = response.data;

    return {
      id: user.ZUID?.toString(),
      email: user.Email,
      name: user.Display_Name || `${user.First_Name || ''} ${user.Last_Name || ''}`.trim()
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
