import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageVendor = SlateTool.create(spec, {
  name: 'Manage Vendor',
  key: 'manage_vendor',
  description: `Create, update, or delete a vendor in Brex. Vendors are counterparties for payments (ACH, wire, check).
Use this to sync vendor records from other systems into Brex, or manage vendor payment details.`,
  instructions: [
    'To create a vendor, omit vendorId and provide at least the vendor name.',
    'To update a vendor, provide vendorId and the fields to change.',
    'To delete a vendor, provide vendorId and set the delete flag to true.'
  ]
})
  .input(
    z.object({
      vendorId: z
        .string()
        .optional()
        .describe('ID of an existing vendor to update or delete. Omit to create.'),
      deleteVendor: z
        .boolean()
        .optional()
        .describe('Set to true to delete the vendor specified by vendorId'),
      companyName: z.string().optional().describe('Company name of the vendor'),
      email: z.string().optional().describe('Contact email of the vendor'),
      phone: z.string().optional().describe('Contact phone of the vendor'),
      paymentAccountId: z
        .string()
        .optional()
        .describe('ID of the payment account/instrument for this vendor'),
      idempotencyKey: z
        .string()
        .optional()
        .describe('Unique key to prevent duplicate vendor creation')
    })
  )
  .output(
    z.object({
      vendorId: z.string().optional().describe('ID of the vendor'),
      companyName: z.string().nullable().optional().describe('Company name'),
      email: z.string().nullable().optional().describe('Contact email'),
      phone: z.string().nullable().optional().describe('Contact phone'),
      deleted: z.boolean().optional().describe('Whether the vendor was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.vendorId && ctx.input.deleteVendor) {
      await client.deleteVendor(ctx.input.vendorId);
      return {
        output: {
          vendorId: ctx.input.vendorId,
          deleted: true
        },
        message: `Vendor **${ctx.input.vendorId}** deleted.`
      };
    }

    let vendor: any;
    let action: string;

    if (ctx.input.vendorId) {
      let updateData: Record<string, any> = {};
      if (ctx.input.companyName !== undefined) updateData.company_name = ctx.input.companyName;
      if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
      if (ctx.input.phone !== undefined) updateData.phone = ctx.input.phone;
      if (ctx.input.paymentAccountId !== undefined)
        updateData.payment_account_id = ctx.input.paymentAccountId;

      vendor = await client.updateVendor(ctx.input.vendorId, updateData);
      action = 'updated';
    } else {
      let vendorData: Record<string, any> = {};
      if (ctx.input.companyName) vendorData.company_name = ctx.input.companyName;
      if (ctx.input.email) vendorData.email = ctx.input.email;
      if (ctx.input.phone) vendorData.phone = ctx.input.phone;
      if (ctx.input.paymentAccountId)
        vendorData.payment_account_id = ctx.input.paymentAccountId;

      let key = ctx.input.idempotencyKey ?? crypto.randomUUID();
      vendor = await client.createVendor(vendorData, key);
      action = 'created';
    }

    return {
      output: {
        vendorId: vendor.id,
        companyName: vendor.company_name ?? null,
        email: vendor.email ?? null,
        phone: vendor.phone ?? null,
        deleted: false
      },
      message: `Vendor **${vendor.company_name || vendor.id}** ${action}.`
    };
  })
  .build();
