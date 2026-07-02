import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let vendorOutputSchema = z.object({
  vendorId: z.string().describe('Vendor ID'),
  displayName: z.string().describe('Vendor display name'),
  companyName: z.string().optional().describe('Company name'),
  email: z.string().optional().describe('Primary email'),
  phone: z.string().optional().describe('Primary phone'),
  balance: z.number().optional().describe('Open balance'),
  active: z.boolean().optional().describe('Whether the vendor is active'),
  syncToken: z.string().describe('Sync token for updates')
});

export let createVendor = SlateTool.create(spec, {
  name: 'Create Vendor',
  key: 'create_vendor',
  description: `Creates a new vendor (supplier) record in QuickBooks with contact details and address information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      displayName: z.string().describe('Display name for the vendor (must be unique)'),
      companyName: z.string().optional().describe('Company name'),
      givenName: z.string().optional().describe('First name'),
      familyName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      phone: z.string().optional().describe('Primary phone number'),
      taxIdentifier: z.string().optional().describe('Tax ID number'),
      accountNumber: z.string().optional().describe('Account number for the vendor'),
      billingAddress: z
        .object({
          line1: z.string().optional(),
          city: z.string().optional(),
          countrySubDivisionCode: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Billing address')
    })
  )
  .output(vendorOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);

    let vendorData: any = {
      DisplayName: ctx.input.displayName
    };

    if (ctx.input.companyName) vendorData.CompanyName = ctx.input.companyName;
    if (ctx.input.givenName) vendorData.GivenName = ctx.input.givenName;
    if (ctx.input.familyName) vendorData.FamilyName = ctx.input.familyName;
    if (ctx.input.email) vendorData.PrimaryEmailAddr = { Address: ctx.input.email };
    if (ctx.input.phone) vendorData.PrimaryPhone = { FreeFormNumber: ctx.input.phone };
    if (ctx.input.taxIdentifier) vendorData.TaxIdentifier = ctx.input.taxIdentifier;
    if (ctx.input.accountNumber) vendorData.AcctNum = ctx.input.accountNumber;

    if (ctx.input.billingAddress) {
      vendorData.BillAddr = {
        Line1: ctx.input.billingAddress.line1,
        City: ctx.input.billingAddress.city,
        CountrySubDivisionCode: ctx.input.billingAddress.countrySubDivisionCode,
        PostalCode: ctx.input.billingAddress.postalCode,
        Country: ctx.input.billingAddress.country
      };
    }

    let vendor = await client.createVendor(vendorData);

    return {
      output: {
        vendorId: vendor.Id,
        displayName: vendor.DisplayName,
        companyName: vendor.CompanyName,
        email: vendor.PrimaryEmailAddr?.Address,
        phone: vendor.PrimaryPhone?.FreeFormNumber,
        balance: vendor.Balance,
        active: vendor.Active,
        syncToken: vendor.SyncToken
      },
      message: `Created vendor **${vendor.DisplayName}** (ID: ${vendor.Id}).`
    };
  })
  .build();

export let getVendor = SlateTool.create(spec, {
  name: 'Get Vendor',
  key: 'get_vendor',
  description: `Retrieves a vendor record by ID, returning full contact and balance details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      vendorId: z.string().describe('QuickBooks Vendor ID')
    })
  )
  .output(vendorOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let vendor = await client.getVendor(ctx.input.vendorId);

    return {
      output: {
        vendorId: vendor.Id,
        displayName: vendor.DisplayName,
        companyName: vendor.CompanyName,
        email: vendor.PrimaryEmailAddr?.Address,
        phone: vendor.PrimaryPhone?.FreeFormNumber,
        balance: vendor.Balance,
        active: vendor.Active,
        syncToken: vendor.SyncToken
      },
      message: `Retrieved vendor **${vendor.DisplayName}** (ID: ${vendor.Id}, balance: $${vendor.Balance ?? 0}).`
    };
  })
  .build();
