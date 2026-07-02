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

export let sendSelfMailer = SlateTool.create(spec, {
  name: 'Send Self-Mailer',
  key: 'send_self_mailer',
  description: `Create and send a folded self-mailer (no envelope required). Provide inside and outside artwork (HTML, template ID, or PDF URL), recipient/sender addresses, and optional merge variables. Available in bifold and trifold sizes.`,
  instructions: [
    'Self-mailers fold and seal without an envelope.',
    'For artwork, use an HTML string, a template ID (tmpl_), or a URL to a hosted PDF.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: recipientSchema.describe('Recipient address'),
      from: recipientSchema.optional().describe('Sender address'),
      inside: z.string().describe('Inside artwork: HTML string, template ID, or PDF URL'),
      outside: z.string().describe('Outside artwork: HTML string, template ID, or PDF URL'),
      size: z
        .enum(['6x18_bifold', '11x9_bifold', '12x9_bifold', '17.75x9_trifold'])
        .optional()
        .describe('Self-mailer size and fold type'),
      description: z.string().optional().describe('Internal description'),
      mergeVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic variables for the template'),
      sendDate: z.string().optional().describe('ISO 8601 date to schedule sending'),
      mailType: z.enum(['usps_first_class', 'usps_standard']).optional().describe('Mail type'),
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
      selfMailerId: z.string().describe('Unique self-mailer ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().optional().nullable().describe('Sender address'),
      size: z.string().optional().nullable().describe('Size'),
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
    let result = await client.createSelfMailer({
      to: resolveRecipient(ctx.input.to),
      from: ctx.input.from ? resolveRecipient(ctx.input.from) : undefined,
      inside: ctx.input.inside,
      outside: ctx.input.outside,
      size: ctx.input.size,
      description: ctx.input.description,
      mergeVariables: ctx.input.mergeVariables,
      sendDate: ctx.input.sendDate,
      mailType: ctx.input.mailType,
      billingGroupId: ctx.input.billingGroupId,
      metadata: ctx.input.metadata,
      useType: ctx.input.useType
    });
    return {
      output: {
        selfMailerId: result.id,
        to: result.to,
        from: result.from ?? null,
        size: result.size ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Self-mailer **${result.id}** created successfully`
    };
  });

export let getSelfMailer = SlateTool.create(spec, {
  name: 'Get Self-Mailer',
  key: 'get_self_mailer',
  description: `Retrieve details of a specific self-mailer including its status and tracking events.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      selfMailerId: z.string().describe('The Lob self-mailer ID (starts with "sfm_")')
    })
  )
  .output(
    z.object({
      selfMailerId: z.string().describe('Self-mailer ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().optional().nullable().describe('Sender address'),
      size: z.string().optional().nullable().describe('Size'),
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
    let result = await client.getSelfMailer(ctx.input.selfMailerId);
    return {
      output: {
        selfMailerId: result.id,
        to: result.to,
        from: result.from ?? null,
        size: result.size ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        trackingEvents: result.tracking_events ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Self-mailer **${result.id}** — status: **${result.status ?? 'unknown'}**`
    };
  });

export let cancelSelfMailer = SlateTool.create(spec, {
  name: 'Cancel Self-Mailer',
  key: 'cancel_self_mailer',
  description: `Cancel a scheduled self-mailer before it enters production.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      selfMailerId: z
        .string()
        .describe('The Lob self-mailer ID to cancel (starts with "sfm_")')
    })
  )
  .output(
    z.object({
      selfMailerId: z.string().describe('ID of the canceled self-mailer'),
      deleted: z.boolean().describe('Whether it was successfully canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelSelfMailer(ctx.input.selfMailerId);
    return {
      output: {
        selfMailerId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Canceled self-mailer **${ctx.input.selfMailerId}**`
    };
  });
