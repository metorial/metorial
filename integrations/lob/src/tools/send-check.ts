import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inlineAddressSchema = z.object({
  name: z.string().optional().describe('Recipient name'),
  company: z.string().optional().describe('Company name'),
  addressLine1: z.string().describe('Primary address line'),
  addressLine2: z.string().optional().describe('Secondary address line'),
  addressCity: z.string().optional().describe('City'),
  addressState: z.string().optional().describe('State'),
  addressZip: z.string().optional().describe('ZIP/postal code'),
  addressCountry: z.string().optional().describe('Country code')
});

let recipientSchema = z.union([
  z.string().describe('Lob address ID (starts with "adr_")'),
  inlineAddressSchema
]);

let mapInlineAddress = (addr: Record<string, any>) => ({
  name: addr.name,
  company: addr.company,
  address_line1: addr.addressLine1,
  address_line2: addr.addressLine2,
  address_city: addr.addressCity,
  address_state: addr.addressState,
  address_zip: addr.addressZip,
  address_country: addr.addressCountry
});

let resolveRecipient = (recipient: string | Record<string, any>) => {
  if (typeof recipient === 'string') return recipient;
  return mapInlineAddress(recipient);
};

export let sendCheck = SlateTool.create(spec, {
  name: 'Send Check',
  key: 'send_check',
  description: `Create and mail a physical check payment. Requires a verified Lob bank account. Provide recipient/sender addresses, amount, and optional memo, logo, or attachments. Checks are domestic only (US addresses).`,
  instructions: [
    'The bank account must be created and verified via micro-deposits before use.',
    'Amount is in dollars (e.g., 100.50 for $100.50).'
  ],
  constraints: [
    'Checks can only be sent to US addresses.',
    'Bank account must be verified before sending checks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: recipientSchema.describe('Recipient address (US only)'),
      from: recipientSchema.describe('Sender address'),
      bankAccountId: z.string().describe('Verified Lob bank account ID (starts with "bank_")'),
      amount: z.number().describe('Check amount in dollars'),
      memo: z.string().optional().describe('Memo line on the check'),
      checkNumber: z.number().optional().describe('Custom check number'),
      message: z
        .string()
        .optional()
        .describe('Message to print in the letter accompanying the check'),
      description: z.string().optional().describe('Internal description'),
      sendDate: z.string().optional().describe('ISO 8601 date to schedule sending'),
      mailType: z.enum(['usps_first_class', 'usps_standard']).optional().describe('Mail type'),
      logo: z.string().optional().describe('URL to logo image for the check'),
      checkBottom: z
        .string()
        .optional()
        .describe('Custom artwork for the check bottom (HTML or template ID)'),
      attachment: z
        .string()
        .optional()
        .describe('Additional page to include with the check (HTML, template ID, or PDF URL)'),
      billingGroupId: z.string().optional().describe('Billing group ID'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      useType: z.string().optional().describe('Use type')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('Unique check ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().describe('Sender address'),
      amount: z.number().describe('Check amount'),
      memo: z.string().optional().nullable().describe('Memo'),
      checkNumber: z.number().optional().nullable().describe('Check number'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('PDF preview URL'),
      status: z.string().optional().nullable().describe('Status'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCheck({
      to: resolveRecipient(ctx.input.to),
      from: resolveRecipient(ctx.input.from),
      bankAccountId: ctx.input.bankAccountId,
      amount: ctx.input.amount,
      memo: ctx.input.memo,
      checkNumber: ctx.input.checkNumber,
      message: ctx.input.message,
      description: ctx.input.description,
      sendDate: ctx.input.sendDate,
      mailType: ctx.input.mailType,
      logo: ctx.input.logo,
      checkBottom: ctx.input.checkBottom,
      attachment: ctx.input.attachment,
      billingGroupId: ctx.input.billingGroupId,
      metadata: ctx.input.metadata,
      useType: ctx.input.useType
    });
    return {
      output: {
        checkId: result.id,
        to: result.to,
        from: result.from,
        amount: result.amount,
        memo: result.memo ?? null,
        checkNumber: result.check_number ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Check **${result.id}** for **$${result.amount}** created successfully`
    };
  });

export let getCheck = SlateTool.create(spec, {
  name: 'Get Check',
  key: 'get_check',
  description: `Retrieve details of a specific check including its status, tracking events, and preview URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      checkId: z.string().describe('The Lob check ID (starts with "chk_")')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('Unique check ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().describe('Sender address'),
      amount: z.number().describe('Check amount'),
      memo: z.string().optional().nullable().describe('Memo'),
      checkNumber: z.number().optional().nullable().describe('Check number'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('PDF preview URL'),
      status: z.string().optional().nullable().describe('Status'),
      trackingEvents: z.array(z.any()).optional().nullable().describe('Tracking events'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCheck(ctx.input.checkId);
    return {
      output: {
        checkId: result.id,
        to: result.to,
        from: result.from,
        amount: result.amount,
        memo: result.memo ?? null,
        checkNumber: result.check_number ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        trackingEvents: result.tracking_events ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Check **${result.id}** for **$${result.amount}** — status: **${result.status ?? 'unknown'}**`
    };
  });

export let cancelCheck = SlateTool.create(spec, {
  name: 'Cancel Check',
  key: 'cancel_check',
  description: `Cancel a scheduled check before it enters production.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      checkId: z.string().describe('The Lob check ID to cancel (starts with "chk_")')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('ID of the canceled check'),
      deleted: z.boolean().describe('Whether it was successfully canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelCheck(ctx.input.checkId);
    return {
      output: {
        checkId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Canceled check **${ctx.input.checkId}**`
    };
  });
