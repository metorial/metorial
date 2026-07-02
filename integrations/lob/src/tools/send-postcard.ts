import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let inlineAddressSchema = z
  .object({
    name: z.string().optional().describe('Recipient name'),
    company: z.string().optional().describe('Company name'),
    addressLine1: z.string().describe('Primary address line'),
    addressLine2: z.string().optional().describe('Secondary address line'),
    addressCity: z.string().optional().describe('City'),
    addressState: z.string().optional().describe('State'),
    addressZip: z.string().optional().describe('ZIP/postal code'),
    addressCountry: z.string().optional().describe('Country code (ISO 3166-1 alpha-2)')
  })
  .describe('Inline address object');

let recipientSchema = z
  .union([z.string().describe('Lob address ID (starts with "adr_")'), inlineAddressSchema])
  .describe('Recipient: either a Lob address ID or an inline address object');

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

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Create and send a physical postcard. Provide the recipient/sender addresses (inline or by ID), front and back artwork (HTML string, template ID, or remote PDF URL), and optional personalization via merge variables. Can be scheduled up to 180 days in advance.`,
  instructions: [
    'For artwork, use an HTML string, a template ID (starts with "tmpl_"), or a URL to a hosted PDF.',
    'Only 4x6 postcards can be sent internationally.'
  ],
  constraints: [
    'Scheduling is limited to 180 days in advance.',
    'Only 4x6 postcards can be sent to international addresses.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: recipientSchema.describe('Recipient address (Lob address ID or inline address)'),
      from: recipientSchema
        .optional()
        .describe('Sender address (Lob address ID or inline address)'),
      front: z
        .string()
        .describe('Front artwork: HTML string, template ID (tmpl_), or PDF URL'),
      back: z.string().describe('Back artwork: HTML string, template ID (tmpl_), or PDF URL'),
      size: z
        .enum(['4x6', '6x9', '6x11'])
        .optional()
        .describe('Postcard size. Defaults to 4x6.'),
      description: z.string().optional().describe('Internal description'),
      mergeVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Dynamic variables to merge into the HTML template'),
      sendDate: z
        .string()
        .optional()
        .describe('ISO 8601 date to schedule sending (up to 180 days)'),
      mailType: z.enum(['usps_first_class', 'usps_standard']).optional().describe('Mail type'),
      billingGroupId: z
        .string()
        .optional()
        .describe('Billing group ID for billing organization'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata key-value pairs (up to 20)'),
      useType: z
        .string()
        .optional()
        .describe('Required for some accounts. E.g., "marketing" or "operational".')
    })
  )
  .output(
    z.object({
      postcardId: z.string().describe('Unique postcard ID'),
      to: z.any().describe('Recipient address details'),
      from: z.any().optional().nullable().describe('Sender address details'),
      size: z.string().optional().nullable().describe('Postcard size'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Scheduled send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('URL to the postcard PDF preview'),
      status: z.string().optional().nullable().describe('Current status of the postcard'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .nullable()
        .describe('Custom metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createPostcard({
      to: resolveRecipient(ctx.input.to),
      from: ctx.input.from ? resolveRecipient(ctx.input.from) : undefined,
      front: ctx.input.front,
      back: ctx.input.back,
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
        postcardId: result.id,
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
      message: `Postcard **${result.id}** created successfully${result.send_date ? `, scheduled for ${result.send_date}` : ''}`
    };
  });

export let getPostcard = SlateTool.create(spec, {
  name: 'Get Postcard',
  key: 'get_postcard',
  description: `Retrieve details of a specific postcard including its status, tracking events, and preview URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postcardId: z.string().describe('The Lob postcard ID (starts with "psc_")')
    })
  )
  .output(
    z.object({
      postcardId: z.string().describe('Unique postcard ID'),
      to: z.any().describe('Recipient address'),
      from: z.any().optional().nullable().describe('Sender address'),
      size: z.string().optional().nullable().describe('Postcard size'),
      description: z.string().optional().nullable().describe('Description'),
      sendDate: z.string().optional().nullable().describe('Send date'),
      expectedDeliveryDate: z
        .string()
        .optional()
        .nullable()
        .describe('Expected delivery date'),
      url: z.string().optional().nullable().describe('PDF preview URL'),
      status: z.string().optional().nullable().describe('Current status'),
      trackingEvents: z.array(z.any()).optional().nullable().describe('USPS tracking events'),
      dateCreated: z.string().optional().nullable().describe('Creation date'),
      metadata: z.record(z.string(), z.string()).optional().nullable().describe('Metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPostcard(ctx.input.postcardId);
    return {
      output: {
        postcardId: result.id,
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
      message: `Postcard **${result.id}** — status: **${result.status ?? 'unknown'}**`
    };
  });

export let listPostcards = SlateTool.create(spec, {
  name: 'List Postcards',
  key: 'list_postcards',
  description: `List postcards with optional filtering by metadata. Returns a paginated list of postcards.`,
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
        .describe('Number of postcards to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of postcards to skip for pagination'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter by metadata key-value pairs')
    })
  )
  .output(
    z.object({
      postcards: z
        .array(
          z.object({
            postcardId: z.string().describe('Postcard ID'),
            description: z.string().optional().nullable().describe('Description'),
            sendDate: z.string().optional().nullable().describe('Send date'),
            status: z.string().optional().nullable().describe('Status'),
            dateCreated: z.string().optional().nullable().describe('Creation date')
          })
        )
        .describe('List of postcards'),
      totalCount: z.number().describe('Total number of postcards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPostcards({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      metadata: ctx.input.metadata
    });
    let postcards = (result.data || []).map((p: any) => ({
      postcardId: p.id,
      description: p.description ?? null,
      sendDate: p.send_date ?? null,
      status: p.status ?? null,
      dateCreated: p.date_created ?? null
    }));
    return {
      output: {
        postcards,
        totalCount: result.total_count ?? result.count ?? postcards.length
      },
      message: `Found **${postcards.length}** postcards`
    };
  });

export let cancelPostcard = SlateTool.create(spec, {
  name: 'Cancel Postcard',
  key: 'cancel_postcard',
  description: `Cancel a scheduled postcard before it enters production. Only works if the send date has not yet passed.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      postcardId: z.string().describe('The Lob postcard ID to cancel (starts with "psc_")')
    })
  )
  .output(
    z.object({
      postcardId: z.string().describe('ID of the canceled postcard'),
      deleted: z.boolean().describe('Whether the postcard was successfully canceled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.cancelPostcard(ctx.input.postcardId);
    return {
      output: {
        postcardId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Canceled postcard **${ctx.input.postcardId}**`
    };
  });
