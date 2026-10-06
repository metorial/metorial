import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapVendor } from '../lib/schemas';
import { exact, fail, keyedMutation, required } from '../lib/validation';
import { spec } from '../spec';

export let manageVendor = SlateTool.create(spec, {
  name: 'Manage Vendor',
  key: 'manage_vendor',
  description: `Create, update, or delete a vendor in Brex. Vendors are counterparties for payments (ACH, wire, check).
Use this to sync vendor records from other systems into Brex, or manage vendor contact details. The retained paymentAccountId cannot supply the complete banking payload and is rejected.`,
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
        .describe(
          'Retained legacy selector; cannot supply the documented complete payment-account payload and is rejected.'
        )
        .meta({ deprecated: true }),
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
      deleted: z.boolean().optional().describe('Whether the vendor was deleted'),
      idempotencyKey: z
        .string()
        .optional()
        .describe(
          'Creation key retained for safe retry; no new key is generated on an automatic retry.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.vendorId !== undefined) required(ctx.input.vendorId, 'vendorId');
    if (ctx.input.paymentAccountId !== undefined)
      fail(
        'paymentAccountId alone cannot create or replace vendor banking details. Omit it; use get_resource to inspect payment instrument IDs for transfers.'
      );
    if (ctx.input.deleteVendor && !ctx.input.vendorId)
      fail('vendorId is required for deletion.');
    const client = new Client({ token: ctx.auth.token });
    if (ctx.input.deleteVendor) {
      if ([ctx.input.companyName, ctx.input.email, ctx.input.phone].some(v => v !== undefined))
        fail('Deletion cannot be combined with vendor updates.');
      await client.getVendor(ctx.input.vendorId!);
      await client.deleteVendor(ctx.input.vendorId!);
      return {
        output: { vendorId: ctx.input.vendorId, deleted: true },
        message: 'Vendor deleted.'
      };
    }
    const data = {
      company_name: ctx.input.companyName,
      email: ctx.input.email,
      phone: ctx.input.phone
    };
    if (ctx.input.vendorId && Object.values(data).every(v => v === undefined))
      fail('Provide at least one vendor field to update.');
    if (!ctx.input.vendorId) required(ctx.input.companyName, 'companyName');
    const receipt = ctx.input.vendorId
      ? {
          value: await client.updateVendor(ctx.input.vendorId, data),
          idempotencyKey: undefined
        }
      : await keyedMutation(
          ctx.input.idempotencyKey,
          [ctx.auth.token, ctx.auth.refreshToken],
          key => client.createVendor(data, key)
        );
    const vendor = receipt.value;
    if (ctx.input.vendorId) exact(vendor.id, ctx.input.vendorId);
    return {
      output: { ...mapVendor(vendor), deleted: false, idempotencyKey: receipt.idempotencyKey },
      message: ctx.input.vendorId
        ? 'Vendor updated.'
        : 'Vendor created. Reuse the same idempotency key for an ambiguous retry.'
    };
  })
  .build();
