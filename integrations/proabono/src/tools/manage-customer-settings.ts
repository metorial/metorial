import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let billingAddressSchema = z.object({
  company: z.string().optional().describe('Company name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  addressLine1: z.string().optional().describe('Address line 1'),
  addressLine2: z.string().optional().describe('Address line 2'),
  zipCode: z.string().optional().describe('Postal/ZIP code'),
  city: z.string().optional().describe('City'),
  country: z.string().optional().describe('Country (ISO 3166-1 alpha-2)'),
  region: z.string().optional().describe('Region (ISO 3166-2)'),
  phone: z.string().optional().describe('Phone number'),
  taxInformation: z.string().optional().describe('Tax identification number')
});

let paymentSettingsSchema = z.object({
  typePayment: z.string().optional().describe('Payment method type'),
  isAutoBilling: z.boolean().optional().describe('Whether auto-billing is enabled'),
  isGreyListed: z.boolean().optional().describe('Suspicious activity flag'),
  noteInvoice: z.string().optional().describe('Custom invoice note'),
  dateNextBilling: z.string().optional().describe('Next billing date')
});

export let manageCustomerSettings = SlateTool.create(spec, {
  name: 'Manage Customer Settings',
  key: 'manage_customer_settings',
  description: `Get or update a customer's billing address and payment settings.
Billing address includes company info, address, phone, and tax information.
Payment settings control auto-billing, grey list status, invoice notes, and payment method.`,
  instructions: [
    'Use "get_billing_address" or "update_billing_address" to manage the billing address.',
    'Use "get_payment_settings" or "update_payment_settings" to manage payment configuration.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'get_billing_address',
          'update_billing_address',
          'get_payment_settings',
          'update_payment_settings'
        ])
        .describe('Action to perform'),
      referenceCustomer: z.string().describe('Customer reference'),
      billingAddress: billingAddressSchema
        .optional()
        .describe('Billing address fields to update'),
      paymentSettings: z
        .object({
          isAutoBilling: z.boolean().optional().describe('Enable/disable auto-billing'),
          isGreyListed: z.boolean().optional().describe('Set grey list flag'),
          noteInvoice: z.string().optional().describe('Invoice footer note'),
          dateNextBilling: z.string().optional().describe('Next billing date (ISO 8601)'),
          typePayment: z
            .string()
            .optional()
            .describe(
              'Payment type (ExternalBank, ExternalCash, ExternalCheck, ExternalOther)'
            )
        })
        .optional()
        .describe('Payment settings to update')
    })
  )
  .output(
    z.object({
      billingAddress: billingAddressSchema.optional().describe('Current billing address'),
      paymentSettings: paymentSettingsSchema.optional().describe('Current payment settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action, referenceCustomer } = ctx.input;

    if (action === 'get_billing_address') {
      let result = await client.getBillingAddress(referenceCustomer);
      let billingAddress = mapBillingAddress(result);
      return {
        output: { billingAddress },
        message: `Retrieved billing address for customer **${referenceCustomer}**`
      };
    }

    if (action === 'update_billing_address') {
      if (!ctx.input.billingAddress) throw new Error('billingAddress is required for update');
      let addr = ctx.input.billingAddress;
      let result = await client.updateBillingAddress(referenceCustomer, {
        Company: addr.company,
        FirstName: addr.firstName,
        LastName: addr.lastName,
        AddressLine1: addr.addressLine1,
        AddressLine2: addr.addressLine2,
        ZipCode: addr.zipCode,
        City: addr.city,
        Country: addr.country,
        Region: addr.region,
        Phone: addr.phone,
        TaxInformation: addr.taxInformation
      });
      let billingAddress = mapBillingAddress(result);
      return {
        output: { billingAddress },
        message: `Updated billing address for customer **${referenceCustomer}**`
      };
    }

    if (action === 'get_payment_settings') {
      let result = await client.getPaymentSettings(referenceCustomer);
      let paymentSettings = mapPaymentSettings(result);
      return {
        output: { paymentSettings },
        message: `Retrieved payment settings for customer **${referenceCustomer}** — auto-billing: ${paymentSettings.isAutoBilling ?? 'n/a'}`
      };
    }

    if (action === 'update_payment_settings') {
      if (!ctx.input.paymentSettings)
        throw new Error('paymentSettings is required for update');
      let ps = ctx.input.paymentSettings;
      let result = await client.updatePaymentSettings(referenceCustomer, {
        IsAutoBilling: ps.isAutoBilling,
        IsGreyListed: ps.isGreyListed,
        NoteInvoice: ps.noteInvoice,
        DateNextBilling: ps.dateNextBilling,
        TypePayment: ps.typePayment
      });
      let paymentSettings = mapPaymentSettings(result);
      return {
        output: { paymentSettings },
        message: `Updated payment settings for customer **${referenceCustomer}**`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapBillingAddress = (raw: any) => ({
  company: raw?.Company,
  firstName: raw?.FirstName,
  lastName: raw?.LastName,
  addressLine1: raw?.AddressLine1,
  addressLine2: raw?.AddressLine2,
  zipCode: raw?.ZipCode,
  city: raw?.City,
  country: raw?.Country,
  region: raw?.Region,
  phone: raw?.Phone,
  taxInformation: raw?.TaxInformation
});

let mapPaymentSettings = (raw: any) => ({
  typePayment: raw?.TypePayment,
  isAutoBilling: raw?.IsAutoBilling,
  isGreyListed: raw?.IsGreyListed,
  noteInvoice: raw?.NoteInvoice,
  dateNextBilling: raw?.DateNextBilling
});
