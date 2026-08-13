import { createZohoOauth } from '@slates/oauth-zoho';
import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_INVOICE_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Full Access',
    description: 'Access all Zoho Invoice resources',
    scope: 'ZohoInvoice.fullaccess.all'
  },

  {
    title: 'Contacts - Create',
    description: 'Create contacts',
    scope: 'ZohoInvoice.contacts.CREATE'
  },

  {
    title: 'Contacts - Read',
    description: 'Read contacts',
    scope: 'ZohoInvoice.contacts.READ'
  },

  {
    title: 'Contacts - Update',
    description: 'Update contacts',
    scope: 'ZohoInvoice.contacts.UPDATE'
  },

  {
    title: 'Invoices - Create',
    description: 'Create invoices',
    scope: 'ZohoInvoice.invoices.CREATE'
  },

  {
    title: 'Invoices - Read',
    description: 'Read invoices',
    scope: 'ZohoInvoice.invoices.READ'
  },

  {
    title: 'Invoices - Update',
    description: 'Update invoices',
    scope: 'ZohoInvoice.invoices.UPDATE'
  },

  {
    title: 'Estimates - Create',
    description: 'Create estimates',
    scope: 'ZohoInvoice.estimates.CREATE'
  },

  {
    title: 'Estimates - Read',
    description: 'Read estimates',
    scope: 'ZohoInvoice.estimates.READ'
  },

  {
    title: 'Estimates - Update',
    description: 'Update estimates',
    scope: 'ZohoInvoice.estimates.UPDATE'
  },

  {
    title: 'Customer Payments - Create',
    description: 'Create customer payments',
    scope: 'ZohoInvoice.customerpayments.CREATE'
  },

  {
    title: 'Customer Payments - Read',
    description: 'Read customer payments',
    scope: 'ZohoInvoice.customerpayments.READ'
  },

  {
    title: 'Customer Payments - Update',
    description: 'Update customer payments',
    scope: 'ZohoInvoice.customerpayments.UPDATE'
  },

  {
    title: 'Credit Notes - Create',
    description: 'Create credit notes',
    scope: 'ZohoInvoice.creditnotes.CREATE'
  },

  {
    title: 'Credit Notes - Read',
    description: 'Read credit notes',
    scope: 'ZohoInvoice.creditnotes.READ'
  },

  {
    title: 'Credit Notes - Update',
    description: 'Update credit notes',
    scope: 'ZohoInvoice.creditnotes.UPDATE'
  },

  {
    title: 'Expenses - Create',
    description: 'Create expenses',
    scope: 'ZohoInvoice.expenses.CREATE'
  },

  {
    title: 'Expenses - Read',
    description: 'Read expenses',
    scope: 'ZohoInvoice.expenses.READ'
  },

  {
    title: 'Expenses - Update',
    description: 'Update expenses',
    scope: 'ZohoInvoice.expenses.UPDATE'
  },

  {
    title: 'Projects - Create',
    description: 'Create projects and time entries',
    scope: 'ZohoInvoice.projects.CREATE'
  },

  {
    title: 'Projects - Read',
    description: 'Read projects and time entries',
    scope: 'ZohoInvoice.projects.READ'
  },

  {
    title: 'Projects - Update',
    description: 'Update projects and time entries',
    scope: 'ZohoInvoice.projects.UPDATE'
  },

  {
    title: 'Settings - Create',
    description: 'Create items',
    scope: 'ZohoInvoice.settings.CREATE'
  },

  {
    title: 'Settings - Read',
    description: 'Read items and organization settings',
    scope: 'ZohoInvoice.settings.READ'
  },

  {
    title: 'Settings - Update',
    description: 'Update items',
    scope: 'ZohoInvoice.settings.UPDATE'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca'] as const;
type ZohoInvoiceProfileContext = {
  output: { token: string; apiDomain: string };
};

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_INVOICE_API_ORIGINS.us],
    eu: [ZOHO_INVOICE_API_ORIGINS.eu],
    in: [ZOHO_INVOICE_API_ORIGINS.in],
    au: [ZOHO_INVOICE_API_ORIGINS.au],
    jp: [ZOHO_INVOICE_API_ORIGINS.jp],
    ca: [ZOHO_INVOICE_API_ORIGINS.ca]
  },
  profile: async (ctx: ZohoInvoiceProfileContext) => {
    let response = await createAxios({
      baseURL: `${ctx.output.apiDomain}/invoice/v3`,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/organizations');
    let organization = response.data?.organizations?.[0];
    let organizationId = organization?.organization_id;

    if (
      (typeof organizationId !== 'string' && typeof organizationId !== 'number') ||
      !String(organizationId)
    ) {
      throw createApiServiceError(
        'Zoho Invoice did not return an organization for this account. Reconnect the account.'
      );
    }

    return {
      id: String(organizationId),
      name: typeof organization.name === 'string' ? organization.name : undefined,
      email: typeof organization.email === 'string' ? organization.email : undefined
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
