import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProAbonoClient } from '../lib/client';
import { spec } from '../spec';

let linkSchema = z
  .object({
    rel: z.string().optional(),
    href: z.string().optional(),
    query: z.string().optional()
  })
  .describe('Encrypted link for hosted pages');

let customerSchema = z.object({
  customerId: z.number().optional().describe('ProAbono internal ID'),
  referenceCustomer: z.string().optional().describe('Your application customer identifier'),
  referenceSegment: z.string().optional().describe('Segment reference'),
  currency: z.string().optional().describe('Customer currency code'),
  name: z.string().optional().describe('Customer full name'),
  email: z.string().optional().describe('Customer email address'),
  language: z.string().optional().describe('ISO 639-1 language code'),
  status: z.string().optional().describe('Customer status (Enabled or Suspended)'),
  referenceAffiliation: z.string().optional().describe('Affiliate identifier'),
  dateAffiliation: z.string().optional().describe('Affiliation date'),
  metadata: z.record(z.string(), z.string()).optional().describe('Custom key/value metadata'),
  links: z.array(linkSchema).optional().describe('Encrypted hosted page links')
});

export let manageCustomers = SlateTool.create(spec, {
  name: 'Manage Customers',
  key: 'manage_customers',
  description: `Create, retrieve, update, list, suspend, or anonymize customers in ProAbono.
Customers are identified by a **ReferenceCustomer** that maps to your application's user identifier.
Supports managing metadata, billing address, and payment settings.
Creating or retrieving a customer returns encrypted links for the hosted customer portal.`,
  instructions: [
    'Use "create" to add a new customer; ProAbono uses the same endpoint for create and update, so providing an existing ReferenceCustomer will update that customer.',
    'Use "suspend" to block portal access and billing for a customer.',
    'Use "anonymize" for GDPR compliance — this clears personal data permanently.'
  ],
  constraints: [
    'Metadata supports up to 5 key/value pairs, each value max 450 characters.',
    'Hosted page links expire — always request fresh links via the API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'list', 'suspend', 'anonymize', 'revoke_links'])
        .describe('Action to perform'),
      referenceCustomer: z
        .string()
        .optional()
        .describe('Customer identifier in your application'),
      email: z.string().optional().describe('Customer email address'),
      name: z.string().optional().describe('Customer full name'),
      language: z.string().optional().describe('ISO 639-1 language code (e.g., "en", "fr")'),
      referenceSegment: z.string().optional().describe('Segment reference'),
      referenceOffer: z
        .string()
        .optional()
        .describe('Offer reference for generating a direct subscription link'),
      referenceAffiliation: z.string().optional().describe('Affiliate identifier'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key/value metadata (max 5 pairs)'),
      page: z.number().optional().describe('Page number for list action'),
      sizePage: z.number().optional().describe('Items per page for list action'),
      referenceFeature: z
        .string()
        .optional()
        .describe('Filter customers by feature usage (list action only)')
    })
  )
  .output(
    z.object({
      customer: customerSchema
        .optional()
        .describe('Customer details (for single-item actions)'),
      customers: z
        .array(customerSchema)
        .optional()
        .describe('List of customers (for list action)'),
      totalItems: z.number().optional().describe('Total number of items (for list action)'),
      page: z.number().optional().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProAbonoClient({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let result = await client.createCustomer({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Email: ctx.input.email,
        Name: ctx.input.name,
        Language: ctx.input.language,
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        ReferenceOffer: ctx.input.referenceOffer,
        ReferenceAffiliation: ctx.input.referenceAffiliation,
        Metadata: ctx.input.metadata
      });
      let customer = mapCustomer(result);
      return {
        output: { customer },
        message: `Created customer **${customer.referenceCustomer || customer.customerId}**`
      };
    }

    if (action === 'get') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for get action');
      let result = await client.getCustomer(
        ctx.input.referenceCustomer,
        ctx.input.referenceOffer
      );
      let customer = mapCustomer(result);
      return {
        output: { customer },
        message: `Retrieved customer **${customer.referenceCustomer}** (status: ${customer.status})`
      };
    }

    if (action === 'update') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for update action');
      let result = await client.updateCustomer({
        ReferenceCustomer: ctx.input.referenceCustomer,
        Email: ctx.input.email,
        Name: ctx.input.name,
        Language: ctx.input.language,
        ReferenceAffiliation: ctx.input.referenceAffiliation,
        Metadata: ctx.input.metadata
      });
      let customer = mapCustomer(result);
      return {
        output: { customer },
        message: `Updated customer **${customer.referenceCustomer}**`
      };
    }

    if (action === 'list') {
      let result = await client.listCustomers({
        ReferenceSegment: ctx.input.referenceSegment || ctx.config.defaultSegment,
        ReferenceFeature: ctx.input.referenceFeature,
        Page: ctx.input.page,
        SizePage: ctx.input.sizePage
      });
      let items = result?.Items || [];
      let customers = items.map(mapCustomer);
      return {
        output: {
          customers,
          totalItems: result?.TotalItems,
          page: result?.Page
        },
        message: `Found **${customers.length}** customers (total: ${result?.TotalItems || 0})`
      };
    }

    if (action === 'suspend') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for suspend action');
      await client.suspendCustomer(ctx.input.referenceCustomer);
      return {
        output: {
          customer: { referenceCustomer: ctx.input.referenceCustomer, status: 'Suspended' }
        },
        message: `Suspended customer **${ctx.input.referenceCustomer}**`
      };
    }

    if (action === 'anonymize') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for anonymize action');
      await client.anonymizeCustomer(ctx.input.referenceCustomer);
      return {
        output: { customer: { referenceCustomer: ctx.input.referenceCustomer } },
        message: `Anonymized customer **${ctx.input.referenceCustomer}** (personal data cleared)`
      };
    }

    if (action === 'revoke_links') {
      if (!ctx.input.referenceCustomer)
        throw new Error('referenceCustomer is required for revoke_links action');
      let result = await client.revokeCustomerLinks(ctx.input.referenceCustomer);
      let customer = mapCustomer(result);
      return {
        output: { customer },
        message: `Revoked encrypted links for customer **${ctx.input.referenceCustomer}** — new links generated`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapCustomer = (raw: any) => ({
  customerId: raw?.Id,
  referenceCustomer: raw?.ReferenceCustomer,
  referenceSegment: raw?.ReferenceSegment,
  currency: raw?.Currency,
  name: raw?.Name,
  email: raw?.Email,
  language: raw?.Language,
  status: raw?.Status,
  referenceAffiliation: raw?.ReferenceAffiliation,
  dateAffiliation: raw?.DateAffiliation,
  metadata: raw?.Metadata,
  links: raw?.Links
});
