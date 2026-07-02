import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let ACCOUNTS_URLS: Record<string, string> = {
  com: 'https://accounts.zoho.com',
  eu: 'https://accounts.zoho.eu',
  in: 'https://accounts.zoho.in',
  'com.au': 'https://accounts.zoho.com.au',
  ca: 'https://accounts.zohocloud.ca',
  jp: 'https://accounts.zoho.com',
  'com.cn': 'https://accounts.zoho.com.cn',
  sa: 'https://accounts.zoho.com'
};

let scopes = [
  {
    title: 'Full Access',
    description: 'Full read and write access to all Zoho Inventory modules',
    scope: 'ZohoInventory.FullAccess.all'
  },
  {
    title: 'Contacts - Read',
    description: 'Read access to contacts and contact persons',
    scope: 'ZohoInventory.contacts.READ'
  },
  {
    title: 'Contacts - Create',
    description: 'Create contacts and contact persons',
    scope: 'ZohoInventory.contacts.CREATE'
  },
  {
    title: 'Contacts - Update',
    description: 'Update contacts and contact persons',
    scope: 'ZohoInventory.contacts.UPDATE'
  },
  {
    title: 'Contacts - Delete',
    description: 'Delete contacts and contact persons',
    scope: 'ZohoInventory.contacts.DELETE'
  },
  {
    title: 'Items - Read',
    description: 'Read access to items',
    scope: 'ZohoInventory.items.READ'
  },
  {
    title: 'Items - Create',
    description: 'Create items',
    scope: 'ZohoInventory.items.CREATE'
  },
  {
    title: 'Items - Update',
    description: 'Update items',
    scope: 'ZohoInventory.items.UPDATE'
  },
  {
    title: 'Items - Delete',
    description: 'Delete items',
    scope: 'ZohoInventory.items.DELETE'
  },
  {
    title: 'Composite Items - Read',
    description: 'Read access to composite/bundled items',
    scope: 'ZohoInventory.compositeitems.READ'
  },
  {
    title: 'Composite Items - Create',
    description: 'Create composite/bundled items',
    scope: 'ZohoInventory.compositeitems.CREATE'
  },
  {
    title: 'Composite Items - Update',
    description: 'Update composite/bundled items',
    scope: 'ZohoInventory.compositeitems.UPDATE'
  },
  {
    title: 'Composite Items - Delete',
    description: 'Delete composite/bundled items',
    scope: 'ZohoInventory.compositeitems.DELETE'
  },
  {
    title: 'Inventory Adjustments - Read',
    description: 'Read access to inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.READ'
  },
  {
    title: 'Inventory Adjustments - Create',
    description: 'Create inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.CREATE'
  },
  {
    title: 'Inventory Adjustments - Update',
    description: 'Update inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.UPDATE'
  },
  {
    title: 'Inventory Adjustments - Delete',
    description: 'Delete inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.DELETE'
  },
  {
    title: 'Transfer Orders - Read',
    description: 'Read access to transfer orders',
    scope: 'ZohoInventory.transferorders.READ'
  },
  {
    title: 'Transfer Orders - Create',
    description: 'Create transfer orders',
    scope: 'ZohoInventory.transferorders.CREATE'
  },
  {
    title: 'Transfer Orders - Update',
    description: 'Update transfer orders',
    scope: 'ZohoInventory.transferorders.UPDATE'
  },
  {
    title: 'Transfer Orders - Delete',
    description: 'Delete transfer orders',
    scope: 'ZohoInventory.transferorders.DELETE'
  },
  {
    title: 'Sales Orders - Read',
    description: 'Read access to sales orders',
    scope: 'ZohoInventory.salesorders.READ'
  },
  {
    title: 'Sales Orders - Create',
    description: 'Create sales orders',
    scope: 'ZohoInventory.salesorders.CREATE'
  },
  {
    title: 'Sales Orders - Update',
    description: 'Update sales orders',
    scope: 'ZohoInventory.salesorders.UPDATE'
  },
  {
    title: 'Sales Orders - Delete',
    description: 'Delete sales orders',
    scope: 'ZohoInventory.salesorders.DELETE'
  },
  {
    title: 'Packages - Read',
    description: 'Read access to packages',
    scope: 'ZohoInventory.packages.READ'
  },
  {
    title: 'Packages - Create',
    description: 'Create packages',
    scope: 'ZohoInventory.packages.CREATE'
  },
  {
    title: 'Packages - Update',
    description: 'Update packages',
    scope: 'ZohoInventory.packages.UPDATE'
  },
  {
    title: 'Packages - Delete',
    description: 'Delete packages',
    scope: 'ZohoInventory.packages.DELETE'
  },
  {
    title: 'Shipment Orders - Read',
    description: 'Read access to shipment orders',
    scope: 'ZohoInventory.shipmentorders.READ'
  },
  {
    title: 'Shipment Orders - Create',
    description: 'Create shipment orders',
    scope: 'ZohoInventory.shipmentorders.CREATE'
  },
  {
    title: 'Shipment Orders - Update',
    description: 'Update shipment orders',
    scope: 'ZohoInventory.shipmentorders.UPDATE'
  },
  {
    title: 'Shipment Orders - Delete',
    description: 'Delete shipment orders',
    scope: 'ZohoInventory.shipmentorders.DELETE'
  },
  {
    title: 'Invoices - Read',
    description: 'Read access to invoices',
    scope: 'ZohoInventory.invoices.READ'
  },
  {
    title: 'Invoices - Create',
    description: 'Create invoices',
    scope: 'ZohoInventory.invoices.CREATE'
  },
  {
    title: 'Invoices - Update',
    description: 'Update invoices',
    scope: 'ZohoInventory.invoices.UPDATE'
  },
  {
    title: 'Invoices - Delete',
    description: 'Delete invoices',
    scope: 'ZohoInventory.invoices.DELETE'
  },
  {
    title: 'Customer Payments - Read',
    description: 'Read access to customer payments',
    scope: 'ZohoInventory.customerpayments.READ'
  },
  {
    title: 'Customer Payments - Create',
    description: 'Create customer payments',
    scope: 'ZohoInventory.customerpayments.CREATE'
  },
  {
    title: 'Customer Payments - Update',
    description: 'Update customer payments',
    scope: 'ZohoInventory.customerpayments.UPDATE'
  },
  {
    title: 'Customer Payments - Delete',
    description: 'Delete customer payments',
    scope: 'ZohoInventory.customerpayments.DELETE'
  },
  {
    title: 'Sales Returns - Read',
    description: 'Read access to sales returns',
    scope: 'ZohoInventory.salesreturns.READ'
  },
  {
    title: 'Sales Returns - Create',
    description: 'Create sales returns',
    scope: 'ZohoInventory.salesreturns.CREATE'
  },
  {
    title: 'Sales Returns - Update',
    description: 'Update sales returns',
    scope: 'ZohoInventory.salesreturns.UPDATE'
  },
  {
    title: 'Sales Returns - Delete',
    description: 'Delete sales returns',
    scope: 'ZohoInventory.salesreturns.DELETE'
  },
  {
    title: 'Credit Notes - Read',
    description: 'Read access to credit notes',
    scope: 'ZohoInventory.creditnotes.READ'
  },
  {
    title: 'Credit Notes - Create',
    description: 'Create credit notes',
    scope: 'ZohoInventory.creditnotes.CREATE'
  },
  {
    title: 'Credit Notes - Update',
    description: 'Update credit notes',
    scope: 'ZohoInventory.creditnotes.UPDATE'
  },
  {
    title: 'Credit Notes - Delete',
    description: 'Delete credit notes',
    scope: 'ZohoInventory.creditnotes.DELETE'
  },
  {
    title: 'Purchase Orders - Read',
    description: 'Read access to purchase orders',
    scope: 'ZohoInventory.purchaseorders.READ'
  },
  {
    title: 'Purchase Orders - Create',
    description: 'Create purchase orders',
    scope: 'ZohoInventory.purchaseorders.CREATE'
  },
  {
    title: 'Purchase Orders - Update',
    description: 'Update purchase orders',
    scope: 'ZohoInventory.purchaseorders.UPDATE'
  },
  {
    title: 'Purchase Orders - Delete',
    description: 'Delete purchase orders',
    scope: 'ZohoInventory.purchaseorders.DELETE'
  },
  {
    title: 'Purchase Receives - Read',
    description: 'Read access to purchase receives',
    scope: 'ZohoInventory.purchasereceives.READ'
  },
  {
    title: 'Purchase Receives - Create',
    description: 'Create purchase receives',
    scope: 'ZohoInventory.purchasereceives.CREATE'
  },
  {
    title: 'Purchase Receives - Update',
    description: 'Update purchase receives',
    scope: 'ZohoInventory.purchasereceives.UPDATE'
  },
  {
    title: 'Purchase Receives - Delete',
    description: 'Delete purchase receives',
    scope: 'ZohoInventory.purchasereceives.DELETE'
  },
  {
    title: 'Bills - Read',
    description: 'Read access to bills',
    scope: 'ZohoInventory.bills.READ'
  },
  {
    title: 'Bills - Create',
    description: 'Create bills',
    scope: 'ZohoInventory.bills.CREATE'
  },
  {
    title: 'Bills - Update',
    description: 'Update bills',
    scope: 'ZohoInventory.bills.UPDATE'
  },
  {
    title: 'Bills - Delete',
    description: 'Delete bills',
    scope: 'ZohoInventory.bills.DELETE'
  },
  {
    title: 'Settings - Read',
    description: 'Read access to settings (users, taxes, currencies, warehouses)',
    scope: 'ZohoInventory.settings.READ'
  },
  {
    title: 'Settings - Create',
    description: 'Create settings entries',
    scope: 'ZohoInventory.settings.CREATE'
  },
  {
    title: 'Settings - Update',
    description: 'Update settings entries',
    scope: 'ZohoInventory.settings.UPDATE'
  },
  {
    title: 'Settings - Delete',
    description: 'Delete settings entries',
    scope: 'ZohoInventory.settings.DELETE'
  }
];

function createInventoryOauth(
  name: string,
  key: string,
  dataCenterDomain: keyof typeof ACCOUNTS_URLS
) {
  let accountsUrl = ACCOUNTS_URLS[dataCenterDomain]!;

  return {
    type: 'auth.oauth' as const,
    name,
    key,
    scopes,

    getAuthorizationUrl: async (ctx: any) => {
      let params = new URLSearchParams({
        scope: ctx.scopes.join(','),
        client_id: ctx.clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });
      return { url: `${accountsUrl}/oauth/v2/auth?${params.toString()}` };
    },

    handleCallback: async (ctx: any) => {
      let http = createAxios();
      let params = new URLSearchParams({
        code: ctx.code,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        redirect_uri: ctx.redirectUri,
        grant_type: 'authorization_code'
      });
      let response = await http.post(`${accountsUrl}/oauth/v2/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          dataCenterDomain
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) return { output: ctx.output };
      let http = createAxios();
      let params = new URLSearchParams({
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        grant_type: 'refresh_token'
      });
      let response = await http.post(`${accountsUrl}/oauth/v2/token`, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt,
          dataCenterDomain: ctx.output.dataCenterDomain || dataCenterDomain
        }
      };
    },

    getProfile: async (ctx: any) => {
      let domain = ctx.output.dataCenterDomain || dataCenterDomain;
      let apiBase = `https://www.zohoapis.${domain}/inventory/v1`;
      let http = createAxios({
        baseURL: apiBase,
        headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
      });
      let response = await http.get('/organizations');
      let orgs = response.data?.organizations || [];
      let org = orgs[0];
      return {
        profile: {
          id: org ? String(org.organization_id) : undefined,
          name: org?.name ?? undefined,
          email: org?.email ?? undefined
        }
      };
    }
  };
}

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      dataCenterDomain: z.string()
    })
  )
  .addOauth(createInventoryOauth('United States (zohoapis.com)', 'oauth_com', 'com'))
  .addOauth(createInventoryOauth('Europe (zohoapis.eu)', 'oauth_eu', 'eu'))
  .addOauth(createInventoryOauth('India (zohoapis.in)', 'oauth_in', 'in'))
  .addOauth(createInventoryOauth('Australia (zohoapis.com.au)', 'oauth_au', 'com.au'))
  .addOauth(createInventoryOauth('Canada (zohoapis.ca)', 'oauth_ca', 'ca'))
  .addOauth(createInventoryOauth('Japan (zohoapis.jp)', 'oauth_jp', 'jp'))
  .addOauth(createInventoryOauth('China (zohoapis.com.cn)', 'oauth_cn', 'com.cn'))
  .addOauth(createInventoryOauth('Saudi Arabia (zohoapis.sa)', 'oauth_sa', 'sa'));
