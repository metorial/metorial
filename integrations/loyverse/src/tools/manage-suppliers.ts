import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let supplierSchema = z.object({
  supplierId: z.string().describe('Supplier ID'),
  supplierName: z.string().optional().describe('Supplier name'),
  contactPerson: z.string().nullable().optional().describe('Contact person name'),
  email: z.string().nullable().optional().describe('Email'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  website: z.string().nullable().optional().describe('Website URL'),
  note: z.string().nullable().optional().describe('Note'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listSuppliers = SlateTool.create(spec, {
  name: 'List Suppliers',
  key: 'list_suppliers',
  description: `Retrieve all supplier records used for inventory sourcing.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional()
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
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let suppliers = (result.suppliers ?? []).map((s: any) => ({
      supplierId: s.id,
      supplierName: s.name,
      contactPerson: s.contact_person,
      email: s.email,
      phoneNumber: s.phone_number,
      website: s.website,
      note: s.note,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      deletedAt: s.deleted_at
    }));

    return {
      output: { suppliers, cursor: result.cursor },
      message: `Retrieved **${suppliers.length}** supplier(s).`
    };
  })
  .build();

export let createOrUpdateSupplier = SlateTool.create(spec, {
  name: 'Create or Update Supplier',
  key: 'create_or_update_supplier',
  description: `Create a new supplier or update an existing one. Suppliers are used for inventory sourcing and can be linked to items.`
})
  .input(
    z.object({
      supplierId: z.string().optional().describe('Supplier ID to update; omit to create'),
      supplierName: z.string().optional().describe('Supplier name'),
      contactPerson: z.string().nullable().optional().describe('Contact person'),
      email: z.string().nullable().optional().describe('Email'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      website: z.string().nullable().optional().describe('Website URL'),
      note: z.string().nullable().optional().describe('Note')
    })
  )
  .output(supplierSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: any = {};
    if (ctx.input.supplierId) body.id = ctx.input.supplierId;
    if (ctx.input.supplierName !== undefined) body.name = ctx.input.supplierName;
    if (ctx.input.contactPerson !== undefined) body.contact_person = ctx.input.contactPerson;
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) body.phone_number = ctx.input.phoneNumber;
    if (ctx.input.website !== undefined) body.website = ctx.input.website;
    if (ctx.input.note !== undefined) body.note = ctx.input.note;

    let result = await client.createOrUpdateSupplier(body);
    let isUpdate = !!ctx.input.supplierId;

    return {
      output: {
        supplierId: result.id,
        supplierName: result.name,
        contactPerson: result.contact_person,
        email: result.email,
        phoneNumber: result.phone_number,
        website: result.website,
        note: result.note,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        deletedAt: result.deleted_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} supplier **${result.name}**.`
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
