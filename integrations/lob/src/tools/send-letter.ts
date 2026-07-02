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

export let sendLetter = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Create and send a physical letter. Provide recipient/sender addresses, letter content (HTML, template ID, or PDF URL), and configure printing options. Supports color/B&W, double-sided, certified mail, return envelopes, and scheduling.`,
  instructions: [
    'For letter content, use an HTML string, a template ID (starts with "tmpl_"), or a URL to a hosted PDF.',
    'Set color to true for full-color printing, false for black-and-white.'
  ],
  constraints: [
    'Up to 60 single-sided pages for domestic destinations.',
    'Scheduling is limited to 180 days in advance.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: recipientSchema.describe('Recipient address (Lob address ID or inline address)'),
      from: recipientSchema.describe('Sender address (Lob address ID or inline address)'),
      file: z
        .string()
        .describe('Letter content: HTML string, template ID (tmpl_), or PDF URL'),
      color: z.boolean().describe('Print in color (true) or black-and-white (false)'),
      description: z.string().optional().describe('Internal description'),
      mergeVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic variables to merge into the template'),
      sendDate: z.string().optional().describe('ISO 8601 date to schedule sending'),
      doubleSided: z.boolean().optional().describe('Print double-sided (default true)'),
      addressPlacement: z
        .enum([
          'top_first_page',
          'insert_blank_page',
          'bottom_first_page_center',
          'bottom_first_page'
        ])
        .optional()
        .describe('Where to place the address on the letter'),
      returnEnvelope: z.boolean().optional().describe('Include a return envelope'),
      perforatedPage: z.number().optional().describe('Page number for perforation'),
      mailType: z.enum(['usps_first_class', 'usps_standard']).optional().describe('Mail type'),
      extraService: z
        .enum(['certified', 'certified_return_receipt', 'registered'])
        .optional()
        .describe('Extra postal service'),
      billingGroupId: z.string().optional().describe('Billing group ID'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs'),
      useType: z.string().optional().describe('Use type (e.g., "marketing" or "operational")')
    })
  )
  .output(
    z.object({
      letterId: z.string().describe('Unique letter ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().describe('Sender address'),
      color: z.boolean().optional().nullable().describe('Color printing'),
      doubleSided: z.boolean().optional().nullable().describe('Double-sided'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('PDF preview URL'),
      status: z.string().optional().nullable().describe('Current status'),
      extraService: z.string().optional().nullable().describe('Extra service type'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createLetter({
      to: resolveRecipient(ctx.input.to),
      from: resolveRecipient(ctx.input.from),
      file: ctx.input.file,
      color: ctx.input.color,
      description: ctx.input.description,
      mergeVariables: ctx.input.mergeVariables,
      sendDate: ctx.input.sendDate,
      doubleSided: ctx.input.doubleSided,
      addressPlacement: ctx.input.addressPlacement,
      returnEnvelope: ctx.input.returnEnvelope,
      mailType: ctx.input.mailType,
      extraService: ctx.input.extraService,
      billingGroupId: ctx.input.billingGroupId,
      metadata: ctx.input.metadata,
      useType: ctx.input.useType
    });
    return {
      output: {
        letterId: result.id,
        to: result.to,
        from: result.from,
        color: result.color ?? null,
        doubleSided: result.double_sided ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        extraService: result.extra_service ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Letter **${result.id}** created successfully${result.send_date ? `, scheduled for ${result.send_date}` : ''}`
    };
  });

export let getLetter = SlateTool.create(spec, {
  name: 'Get Letter',
  key: 'get_letter',
  description: `Retrieve details of a specific letter including its status, tracking events, and preview URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      letterId: z.string().describe('The Lob letter ID (starts with "ltr_")')
    })
  )
  .output(
    z.object({
      letterId: z.string().describe('Unique letter ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().describe('Sender address'),
      color: z.boolean().optional().nullable().describe('Color printing'),
      doubleSided: z.boolean().optional().nullable().describe('Double-sided'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('PDF preview URL'),
      status: z.string().optional().nullable().describe('Current status'),
      extraService: z.string().optional().nullable().describe('Extra service type'),
      trackingEvents: z.array(z.any()).optional().nullable().describe('USPS tracking events'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLetter(ctx.input.letterId);
    return {
      output: {
        letterId: result.id,
        to: result.to,
        from: result.from,
        color: result.color ?? null,
        doubleSided: result.double_sided ?? null,
        description: result.description ?? null,
        sendDate: result.send_date ?? null,
        expectedDeliveryDate: result.expected_delivery_date ?? null,
        url: result.url ?? null,
        status: result.status ?? null,
        extraService: result.extra_service ?? null,
        trackingEvents: result.tracking_events ?? null,
        dateCreated: result.date_created ?? null,
        metadata: result.metadata ?? null
      },
      message: `Letter **${result.id}** — status: **${result.status ?? 'unknown'}**`
    };
  });

export let listLetters = SlateTool.create(spec, {
  name: 'List Letters',
  key: 'list_letters',
  description: `List letters with optional filtering. Returns a paginated list of letters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of letters to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of letters to skip for pagination'),
      metadata: z.record(z.string(), z.string()).optional().describe('Filter by metadata')
    })
  )
  .output(
    z.object({
      letters: z.array(
        z.object({
          letterId: z.string().describe('Letter ID'),
          description: z.string().optional().nullable().describe('Description'),
          sendDate: z.string().optional().nullable().describe('Send date'),
          status: z.string().optional().nullable().describe('Status'),
          dateCreated: z.string().optional().nullable().describe('Creation date')
        })
      ),
      totalCount: z.number().describe('Total number of letters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listLetters({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      metadata: ctx.input.metadata
    });
    let letters = (result.data || []).map((l: any) => ({
      letterId: l.id,
      description: l.description ?? null,
      sendDate: l.send_date ?? null,
      status: l.status ?? null,
      dateCreated: l.date_created ?? null
    }));
    return {
      output: {
        letters,
        totalCount: result.total_count ?? result.count ?? letters.length
      },
      message: `Found **${letters.length}** letters`
    };
  });

export let cancelLetter = SlateTool.create(spec, {
  name: 'Cancel Letter',
  key: 'cancel_letter',
  description: `Cancel a scheduled letter before it enters production. Only works if the send date has not yet passed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      letterId: z.string().describe('The Lob letter ID to cancel (starts with "ltr_")')
    })
  )
  .output(
    z.object({
      letterId: z.string().describe('ID of the canceled letter'),
      deleted: z.boolean().describe('Whether the letter was successfully canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelLetter(ctx.input.letterId);
    return {
      output: {
        letterId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Canceled letter **${ctx.input.letterId}**`
    };
  });
