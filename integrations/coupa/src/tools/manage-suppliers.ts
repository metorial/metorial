import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

let supplierOutputSchema = z.object({
  supplierId: z.number().describe('Coupa internal supplier ID'),
  name: z.string().nullable().optional().describe('Supplier name'),
  supplierNumber: z.string().nullable().optional().describe('Supplier number'),
  status: z.string().nullable().optional().describe('Supplier status (active, inactive)'),
  displayName: z.string().nullable().optional().describe('Supplier display name'),
  primaryContact: z.any().nullable().optional().describe('Primary contact'),
  primaryAddress: z.any().nullable().optional().describe('Primary address'),
  paymentMethod: z.string().nullable().optional().describe('Payment method'),
  paymentTerm: z.any().nullable().optional().describe('Payment terms'),
  website: z.string().nullable().optional().describe('Supplier website'),
  taxId: z.string().nullable().optional().describe('Tax ID / VAT number'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp'),
  rawData: z.any().optional().describe('Complete raw supplier data')
});

export let searchSuppliers = SlateTool.create(spec, {
  name: 'Search Suppliers',
  key: 'search_suppliers',
  description: `Search and list suppliers in Coupa. Filter by name, status, supplier number, or other attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe(
          'Filter by supplier name (exact match or use filters for contains/starts_with)'
        ),
      status: z.string().optional().describe('Filter by status (e.g. "active", "inactive")'),
      supplierNumber: z.string().optional().describe('Filter by supplier number'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter suppliers updated after this date (ISO 8601)'),
      filters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional Coupa query filters'),
      orderBy: z.string().optional().describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierOutputSchema).describe('List of matching suppliers'),
      count: z.number().describe('Number of suppliers returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let filters: Record<string, string> = {};
    if (ctx.input.filters) {
      for (let [key, value] of Object.entries(ctx.input.filters)) {
        filters[key] = value;
      }
    }
    if (ctx.input.name) filters.name = ctx.input.name;
    if (ctx.input.status) filters.status = ctx.input.status;
    if (ctx.input.supplierNumber) filters.number = ctx.input.supplierNumber;
    if (ctx.input.updatedAfter) filters['updated-at[gt]'] = ctx.input.updatedAfter;

    let results = await client.listSuppliers({
      filters,
      orderBy: ctx.input.orderBy,
      dir: ctx.input.sortDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let suppliers = (Array.isArray(results) ? results : []).map((s: any) => ({
      supplierId: s.id,
      name: s.name ?? null,
      supplierNumber: s.number ?? null,
      status: s.status ?? null,
      displayName: s['display-name'] ?? s.display_name ?? null,
      primaryContact: s['primary-contact'] ?? s.primary_contact ?? null,
      primaryAddress: s['primary-address'] ?? s.primary_address ?? null,
      paymentMethod: s['payment-method'] ?? s.payment_method ?? null,
      paymentTerm: s['payment-term'] ?? s.payment_term ?? null,
      website: s['website-url'] ?? s.website_url ?? null,
      taxId: s['tax-id'] ?? s.tax_id ?? null,
      createdAt: s['created-at'] ?? s.created_at ?? null,
      updatedAt: s['updated-at'] ?? s.updated_at ?? null,
      rawData: s
    }));

    return {
      output: {
        suppliers,
        count: suppliers.length
      },
      message: `Found **${suppliers.length}** supplier(s).`
    };
  })
  .build();

export let createSupplier = SlateTool.create(spec, {
  name: 'Create Supplier',
  key: 'create_supplier',
  description: `Create a new supplier record in Coupa with name, address, contact information, and payment details.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Supplier name'),
      supplierNumber: z.string().optional().describe('Supplier number'),
      displayName: z.string().optional().describe('Display name'),
      status: z.enum(['active', 'inactive']).optional().describe('Supplier status'),
      website: z.string().optional().describe('Supplier website URL'),
      taxId: z.string().optional().describe('Tax ID / VAT number'),
      primaryAddress: z
        .object({
          street1: z.string().optional(),
          street2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          countryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code')
        })
        .optional()
        .describe('Primary address'),
      primaryContact: z
        .object({
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional()
        })
        .optional()
        .describe('Primary contact'),
      paymentTermCode: z.string().optional().describe('Payment term code'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(supplierOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {
      name: ctx.input.name
    };

    if (ctx.input.supplierNumber) payload.number = ctx.input.supplierNumber;
    if (ctx.input.displayName) payload['display-name'] = ctx.input.displayName;
    if (ctx.input.status) payload.status = ctx.input.status;
    if (ctx.input.website) payload['website-url'] = ctx.input.website;
    if (ctx.input.taxId) payload['tax-id'] = ctx.input.taxId;

    if (ctx.input.primaryAddress) {
      let a = ctx.input.primaryAddress;
      payload['primary-address'] = {
        street1: a.street1,
        street2: a.street2,
        city: a.city,
        state: a.state,
        'postal-code': a.postalCode,
        country: a.countryCode ? { code: a.countryCode } : undefined
      };
    }

    if (ctx.input.primaryContact) {
      let c = ctx.input.primaryContact;
      payload['primary-contact'] = {
        'name-fullname': c.name,
        email: c.email,
        'phone-work': c.phone
      };
    }

    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.createSupplier(payload);

    return {
      output: {
        supplierId: result.id,
        name: result.name ?? null,
        supplierNumber: result.number ?? null,
        status: result.status ?? null,
        displayName: result['display-name'] ?? result.display_name ?? null,
        primaryContact: result['primary-contact'] ?? result.primary_contact ?? null,
        primaryAddress: result['primary-address'] ?? result.primary_address ?? null,
        paymentMethod: result['payment-method'] ?? result.payment_method ?? null,
        paymentTerm: result['payment-term'] ?? result.payment_term ?? null,
        website: result['website-url'] ?? result.website_url ?? null,
        taxId: result['tax-id'] ?? result.tax_id ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Created supplier **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateSupplier = SlateTool.create(spec, {
  name: 'Update Supplier',
  key: 'update_supplier',
  description: `Update an existing supplier record in Coupa. Modify name, status, address, contact info, payment terms, or custom fields. Note: when updating the primary address, you can update address attributes but cannot associate a different address ID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      supplierId: z.number().describe('Coupa supplier ID to update'),
      name: z.string().optional().describe('Updated supplier name'),
      displayName: z.string().optional().describe('Updated display name'),
      status: z.enum(['active', 'inactive']).optional().describe('Updated status'),
      website: z.string().optional().describe('Updated website URL'),
      taxId: z.string().optional().describe('Updated Tax ID / VAT number'),
      primaryAddress: z
        .object({
          street1: z.string().optional(),
          street2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          countryCode: z.string().optional()
        })
        .optional()
        .describe('Updated primary address attributes'),
      primaryContact: z
        .object({
          name: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional()
        })
        .optional()
        .describe('Updated primary contact'),
      paymentTermCode: z.string().optional().describe('Updated payment term code'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to update')
    })
  )
  .output(supplierOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CoupaClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let payload: any = {};

    if (ctx.input.name) payload.name = ctx.input.name;
    if (ctx.input.displayName) payload['display-name'] = ctx.input.displayName;
    if (ctx.input.status) payload.status = ctx.input.status;
    if (ctx.input.website) payload['website-url'] = ctx.input.website;
    if (ctx.input.taxId) payload['tax-id'] = ctx.input.taxId;

    if (ctx.input.primaryAddress) {
      let a = ctx.input.primaryAddress;
      payload['primary-address'] = {};
      if (a.street1 !== undefined) payload['primary-address'].street1 = a.street1;
      if (a.street2 !== undefined) payload['primary-address'].street2 = a.street2;
      if (a.city !== undefined) payload['primary-address'].city = a.city;
      if (a.state !== undefined) payload['primary-address'].state = a.state;
      if (a.postalCode !== undefined) payload['primary-address']['postal-code'] = a.postalCode;
      if (a.countryCode !== undefined)
        payload['primary-address'].country = { code: a.countryCode };
    }

    if (ctx.input.primaryContact) {
      let c = ctx.input.primaryContact;
      payload['primary-contact'] = {};
      if (c.name) payload['primary-contact']['name-fullname'] = c.name;
      if (c.email) payload['primary-contact'].email = c.email;
      if (c.phone) payload['primary-contact']['phone-work'] = c.phone;
    }

    if (ctx.input.paymentTermCode)
      payload['payment-term'] = { code: ctx.input.paymentTermCode };

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        payload[key] = value;
      }
    }

    let result = await client.updateSupplier(ctx.input.supplierId, payload);

    return {
      output: {
        supplierId: result.id,
        name: result.name ?? null,
        supplierNumber: result.number ?? null,
        status: result.status ?? null,
        displayName: result['display-name'] ?? result.display_name ?? null,
        primaryContact: result['primary-contact'] ?? result.primary_contact ?? null,
        primaryAddress: result['primary-address'] ?? result.primary_address ?? null,
        paymentMethod: result['payment-method'] ?? result.payment_method ?? null,
        paymentTerm: result['payment-term'] ?? result.payment_term ?? null,
        website: result['website-url'] ?? result.website_url ?? null,
        taxId: result['tax-id'] ?? result.tax_id ?? null,
        createdAt: result['created-at'] ?? result.created_at ?? null,
        updatedAt: result['updated-at'] ?? result.updated_at ?? null,
        rawData: result
      },
      message: `Updated supplier **${result.name ?? result.id}**.`
    };
  })
  .build();
