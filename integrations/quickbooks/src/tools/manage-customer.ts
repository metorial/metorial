import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let addressSchema = z
  .object({
    line1: z.string().optional().describe('Street address line 1'),
    line2: z.string().optional().describe('Street address line 2'),
    city: z.string().optional().describe('City'),
    countrySubDivisionCode: z.string().optional().describe('State or province code'),
    postalCode: z.string().optional().describe('Postal/ZIP code'),
    country: z.string().optional().describe('Country')
  })
  .optional();

let customerOutputSchema = z.object({
  customerId: z.string().describe('Customer ID'),
  displayName: z.string().describe('Customer display name'),
  companyName: z.string().optional().describe('Company name'),
  email: z.string().optional().describe('Primary email address'),
  phone: z.string().optional().describe('Primary phone number'),
  balance: z.number().optional().describe('Open balance amount'),
  active: z.boolean().optional().describe('Whether the customer is active'),
  syncToken: z.string().describe('Sync token for updates')
});

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Creates a new customer record in QuickBooks. Supports full contact details, billing/shipping addresses, and parent customer hierarchy.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      displayName: z.string().describe('Display name for the customer (must be unique)'),
      companyName: z.string().optional().describe('Company name'),
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Primary phone number'),
      mobile: z.string().optional().describe('Mobile phone number'),
      billingAddress: addressSchema.describe('Billing address'),
      shippingAddress: addressSchema.describe('Shipping address'),
      parentCustomerId: z
        .string()
        .optional()
        .describe('Parent customer ID for sub-customer hierarchy'),
      taxable: z.boolean().optional().describe('Whether the customer is taxable'),
      notes: z.string().optional().describe('Notes about the customer')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let customerData: any = {
      DisplayName: ctx.input.displayName
    };

    if (ctx.input.companyName) customerData.CompanyName = ctx.input.companyName;
    if (ctx.input.givenName) customerData.GivenName = ctx.input.givenName;
    if (ctx.input.familyName) customerData.FamilyName = ctx.input.familyName;
    if (ctx.input.email) customerData.PrimaryEmailAddr = { Address: ctx.input.email };
    if (ctx.input.phone) customerData.PrimaryPhone = { FreeFormNumber: ctx.input.phone };
    if (ctx.input.mobile) customerData.Mobile = { FreeFormNumber: ctx.input.mobile };
    if (ctx.input.notes) customerData.Notes = ctx.input.notes;
    if (ctx.input.taxable !== undefined) customerData.Taxable = ctx.input.taxable;
    if (ctx.input.parentCustomerId) {
      customerData.Job = true;
      customerData.ParentRef = { value: ctx.input.parentCustomerId };
    }

    if (ctx.input.billingAddress) {
      customerData.BillAddr = {
        Line1: ctx.input.billingAddress.line1,
        Line2: ctx.input.billingAddress.line2,
        City: ctx.input.billingAddress.city,
        CountrySubDivisionCode: ctx.input.billingAddress.countrySubDivisionCode,
        PostalCode: ctx.input.billingAddress.postalCode,
        Country: ctx.input.billingAddress.country
      };
    }

    if (ctx.input.shippingAddress) {
      customerData.ShipAddr = {
        Line1: ctx.input.shippingAddress.line1,
        Line2: ctx.input.shippingAddress.line2,
        City: ctx.input.shippingAddress.city,
        CountrySubDivisionCode: ctx.input.shippingAddress.countrySubDivisionCode,
        PostalCode: ctx.input.shippingAddress.postalCode,
        Country: ctx.input.shippingAddress.country
      };
    }

    let customer = await client.createCustomer(customerData);

    return {
      output: {
        customerId: customer.Id,
        displayName: customer.DisplayName,
        companyName: customer.CompanyName,
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        balance: customer.Balance,
        active: customer.Active,
        syncToken: customer.SyncToken
      },
      message: `Created customer **${customer.DisplayName}** (ID: ${customer.Id}).`
    };
  })
  .build();

export let updateCustomer = SlateTool.create(spec, {
  name: 'Update Customer',
  key: 'update_customer',
  description: `Updates an existing customer record in QuickBooks. Fetches the current customer data first to ensure the sync token is correct, then applies the provided updates.`,
  instructions: ['Only provided fields will be updated; omitted fields remain unchanged.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('QuickBooks Customer ID to update'),
      displayName: z.string().optional().describe('New display name'),
      companyName: z.string().optional().describe('Company name'),
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Primary phone number'),
      active: z.boolean().optional().describe('Whether the customer is active'),
      notes: z.string().optional().describe('Notes about the customer'),
      billingAddress: addressSchema.describe('Billing address'),
      shippingAddress: addressSchema.describe('Shipping address')
    })
  )
  .output(customerOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let existing = await client.getCustomer(ctx.input.customerId);

    let updateData: any = {
      Id: ctx.input.customerId,
      SyncToken: existing.SyncToken,
      sparse: true
    };

    if (ctx.input.displayName) updateData.DisplayName = ctx.input.displayName;
    if (ctx.input.companyName) updateData.CompanyName = ctx.input.companyName;
    if (ctx.input.givenName) updateData.GivenName = ctx.input.givenName;
    if (ctx.input.familyName) updateData.FamilyName = ctx.input.familyName;
    if (ctx.input.email) updateData.PrimaryEmailAddr = { Address: ctx.input.email };
    if (ctx.input.phone) updateData.PrimaryPhone = { FreeFormNumber: ctx.input.phone };
    if (ctx.input.active !== undefined) updateData.Active = ctx.input.active;
    if (ctx.input.notes) updateData.Notes = ctx.input.notes;

    if (ctx.input.billingAddress) {
      updateData.BillAddr = {
        Line1: ctx.input.billingAddress.line1,
        Line2: ctx.input.billingAddress.line2,
        City: ctx.input.billingAddress.city,
        CountrySubDivisionCode: ctx.input.billingAddress.countrySubDivisionCode,
        PostalCode: ctx.input.billingAddress.postalCode,
        Country: ctx.input.billingAddress.country
      };
    }

    if (ctx.input.shippingAddress) {
      updateData.ShipAddr = {
        Line1: ctx.input.shippingAddress.line1,
        Line2: ctx.input.shippingAddress.line2,
        City: ctx.input.shippingAddress.city,
        CountrySubDivisionCode: ctx.input.shippingAddress.countrySubDivisionCode,
        PostalCode: ctx.input.shippingAddress.postalCode,
        Country: ctx.input.shippingAddress.country
      };
    }

    let customer = await client.updateCustomer(updateData);

    return {
      output: {
        customerId: customer.Id,
        displayName: customer.DisplayName,
        companyName: customer.CompanyName,
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        balance: customer.Balance,
        active: customer.Active,
        syncToken: customer.SyncToken
      },
      message: `Updated customer **${customer.DisplayName}** (ID: ${customer.Id}).`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieves a customer record by ID, returning contact details, addresses, balance, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('QuickBooks Customer ID')
    })
  )
  .output(
    customerOutputSchema.extend({
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      billingAddress: z.any().optional().describe('Billing address'),
      shippingAddress: z.any().optional().describe('Shipping address')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let customer = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: customer.Id,
        displayName: customer.DisplayName,
        companyName: customer.CompanyName,
        givenName: customer.GivenName,
        familyName: customer.FamilyName,
        email: customer.PrimaryEmailAddr?.Address,
        phone: customer.PrimaryPhone?.FreeFormNumber,
        balance: customer.Balance,
        active: customer.Active,
        syncToken: customer.SyncToken,
        billingAddress: customer.BillAddr,
        shippingAddress: customer.ShipAddr
      },
      message: `Retrieved customer **${customer.DisplayName}** (ID: ${customer.Id}, balance: $${customer.Balance ?? 0}).`
    };
  })
  .build();
