import { createZohoOauth } from '@slates/oauth-zoho';
import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { ZOHO_INVENTORY_API_ORIGINS } from './lib/client';

let scopes = [
  {
    title: 'Full Access',
    description: 'Access all Zoho Inventory resources',
    scope: 'ZohoInventory.FullAccess.all'
  },

  {
    title: 'Contacts - Read',
    description: 'Read contacts',
    scope: 'ZohoInventory.contacts.READ'
  },

  {
    title: 'Contacts - Create',
    description: 'Create contacts',
    scope: 'ZohoInventory.contacts.CREATE'
  },

  {
    title: 'Contacts - Update',
    description: 'Update contacts',
    scope: 'ZohoInventory.contacts.UPDATE'
  },

  {
    title: 'Contacts - Delete',
    description: 'Delete contacts',
    scope: 'ZohoInventory.contacts.DELETE'
  },

  {
    title: 'Items - Read',
    description: 'Read items',
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
    title: 'Inventory Adjustments - Create',
    description: 'Create inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.CREATE'
  },

  {
    title: 'Inventory Adjustments - Delete',
    description: 'Delete inventory adjustments',
    scope: 'ZohoInventory.inventoryadjustments.DELETE'
  },

  {
    title: 'Transfer Orders - Read',
    description: 'Read transfer orders',
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
    description: 'Read sales orders',
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
    title: 'Packages - Create',
    description: 'Create packages',
    scope: 'ZohoInventory.packages.CREATE'
  },

  {
    title: 'Packages - Delete',
    description: 'Delete packages',
    scope: 'ZohoInventory.packages.DELETE'
  },

  {
    title: 'Shipment Orders - Read',
    description: 'Read shipment orders',
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
    description: 'Read invoices',
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
    title: 'Customer Payments - Create',
    description: 'Create customer payments',
    scope: 'ZohoInventory.customerpayments.CREATE'
  },

  {
    title: 'Customer Payments - Delete',
    description: 'Delete customer payments',
    scope: 'ZohoInventory.customerpayments.DELETE'
  },

  {
    title: 'Credit Notes - Read',
    description: 'Read credit notes',
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
    description: 'Read purchase orders',
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
    title: 'Bills - Read',
    description: 'Read bills',
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
    description: 'Read warehouses and organization settings',
    scope: 'ZohoInventory.settings.READ'
  }
];

let supportedRegions = ['us', 'eu', 'in', 'au', 'jp', 'ca', 'sa'] as const;
type ZohoInventoryProfileContext = {
  output: { token: string; apiDomain: string };
};

let oauth = createZohoOauth({
  supportedRegions,
  scopes,
  apiOrigins: {
    us: [ZOHO_INVENTORY_API_ORIGINS.us],
    eu: [ZOHO_INVENTORY_API_ORIGINS.eu],
    in: [ZOHO_INVENTORY_API_ORIGINS.in],
    au: [ZOHO_INVENTORY_API_ORIGINS.au],
    jp: [ZOHO_INVENTORY_API_ORIGINS.jp],
    ca: [ZOHO_INVENTORY_API_ORIGINS.ca],
    sa: [ZOHO_INVENTORY_API_ORIGINS.sa]
  },
  profile: async (ctx: ZohoInventoryProfileContext) => {
    let response = await createAxios({
      baseURL: `${ctx.output.apiDomain}/inventory/v1`,
      headers: { Authorization: `Zoho-oauthtoken ${ctx.output.token}` }
    }).get('/organizations');
    let organization = response.data?.organizations?.[0];

    return {
      id: organization ? String(organization.organization_id) : undefined,
      name: organization?.name,
      email: organization?.email
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
