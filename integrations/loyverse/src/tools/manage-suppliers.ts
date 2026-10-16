import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let supplierSchema = z.object({
  supplierId: z.string().describe('Supplier ID'),
  supplierName: z.string().optional().describe('Supplier name'),
  contactPerson: z.string().nullable().optional().describe('Contact person name'),
  email: z.string().nullable().optional().describe('Email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  website: z.string().nullable().optional().describe('Website URL'),
  address1: z.string().nullable().optional().describe('Address line 1'),
  address2: z.string().nullable().optional().describe('Address line 2'),
  city: z.string().nullable().optional().describe('City'),
  region: z.string().nullable().optional().describe('State or region'),
  postalCode: z.string().nullable().optional().describe('Postal/ZIP code'),
  countryCode: z.string().nullable().optional().describe('Two-letter country code'),
  note: z.string().nullable().optional().describe('Note'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

let mapSupplier = (s: any) => ({
  supplierId: s.id,
  supplierName: s.name,
  contactPerson: s.contact ?? s.contact_person,
  email: s.email,
  phoneNumber: s.phone_number,
  website: s.website,
  address1: s.address_1,
  address2: s.address_2,
  city: s.city,
  region: s.region,
  postalCode: s.postal_code,
  countryCode: s.country_code,
  note: s.note,
  createdAt: s.created_at,
  updatedAt: s.updated_at,
  deletedAt: s.deleted_at
});

let SUPPLIER_WRITABLE_KEYS = [
  'name',
  'contact',
  'email',
  'phone_number',
  'website',
  'address_1',
  'address_2',
  'city',
  'region',
  'postal_code',
  'country_code',
  'note'
] as const;

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description: `Retrieve supplier records used for inventory sourcing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      supplierIds: z
        .array(z.string())
        .optional()
        .describe('Only return suppliers with these IDs'),
      limit: z.number().min(1).max(250).optional().describe('Number of suppliers to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z.boolean().optional().describe('Include deleted suppliers')
    })
  )
  .output(
    z.object({
      suppliers: z.array(supplierSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSuppliers({
      supplierIds: joinIds(ctx.input.supplierIds),
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let suppliers = (result.suppliers ?? []).map(mapSupplier);

    return {
      output: { suppliers, cursor: result.cursor },
      message: `Retrieved **${suppliers.length}** supplier(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();

export let createOrUpdateSupplier = SlateTool.create(spec, {
  name: 'Create or Update Supplier',
  key: 'create_or_update_supplier',
  description: `Create a new supplier or update an existing one. Suppliers are used for inventory sourcing and can be linked to items. When updating, fields you omit keep their current values.`,
  instructions: ['supplierName is required when creating a supplier.']
})
  .input(
    z.object({
      supplierId: z.string().optional().describe('Supplier ID to update; omit to create'),
      supplierName: z
        .string()
        .optional()
        .describe('Supplier company name (required when creating, max 64 characters)'),
      contactPerson: z.string().nullable().optional().describe('Contact person'),
      email: z.string().nullable().optional().describe('Email'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      website: z.string().nullable().optional().describe('Website URL'),
      address1: z.string().nullable().optional().describe('Address line 1'),
      address2: z.string().nullable().optional().describe('Address line 2'),
      city: z.string().nullable().optional().describe('City'),
      region: z.string().nullable().optional().describe('State or region'),
      postalCode: z.string().nullable().optional().describe('Postal/ZIP code'),
      countryCode: z
        .string()
        .nullable()
        .optional()
        .describe('Two-letter ISO 3166-1 country code'),
      note: z.string().nullable().optional().describe('Note')
    })
  )
  .output(supplierSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.supplierId;

    let body: any = {};
    if (isUpdate) {
      let existing = await client.getSupplier(input.supplierId!);
      body = pickWritable(existing, SUPPLIER_WRITABLE_KEYS);
      body.id = input.supplierId;
    } else {
      requireForCreate(input.supplierName, 'supplierName', 'supplier');
    }

    if (input.supplierName !== undefined) body.name = input.supplierName;
    if (input.contactPerson !== undefined) body.contact = input.contactPerson;
    if (input.email !== undefined) body.email = input.email;
    if (input.phoneNumber !== undefined) body.phone_number = input.phoneNumber;
    if (input.website !== undefined) body.website = input.website;
    if (input.address1 !== undefined) body.address_1 = input.address1;
    if (input.address2 !== undefined) body.address_2 = input.address2;
    if (input.city !== undefined) body.city = input.city;
    if (input.region !== undefined) body.region = input.region;
    if (input.postalCode !== undefined) body.postal_code = input.postalCode;
    if (input.countryCode !== undefined) body.country_code = input.countryCode;
    if (input.note !== undefined) body.note = input.note;

    let result = await client.createOrUpdateSupplier(body);

    return {
      output: mapSupplier(result),
      message: `${isUpdate ? 'Updated' : 'Created'} supplier **${result.name ?? result.id}**.`
    };
  })
  .build();

export let deleteSupplier = SlateTool.create(spec, {
  name: 'Delete Supplier',
  key: 'delete_supplier',
  description: `Delete a supplier record by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      supplierId: z.string().describe('ID of the supplier to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSupplier(ctx.input.supplierId);

    return {
      output: { deleted: true },
      message: `Deleted supplier \`${ctx.input.supplierId}\`.`
    };
  })
  .build();
