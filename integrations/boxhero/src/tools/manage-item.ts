import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, validateId } from '../lib/client';
import { spec } from '../spec';

export let manageItem = SlateTool.create(spec, {
  name: 'Manage Item',
  key: 'manage_item',
  description:
    'Create, partially update, or delete an inventory item. Use list_items or get_item to discover and inspect items; list_attributes provides custom attribute IDs. Stock changes after creation use create_transaction.',
  constraints: [
    'Requires a team in Location mode and the appropriate item, cost, price, or stock permissions.',
    'Initial stock is applied after item creation. If that step fails, the item can still exist; inspect the error and list_items before retrying creation.',
    'Deleting an item also removes it from bundles. Historical transactions keep their snapshots.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      itemId: z
        .number()
        .optional()
        .describe('Required for update/delete; discover with list_items'),
      name: z
        .string()
        .max(255)
        .optional()
        .describe('Required for create; new display name for update'),
      sku: z
        .string()
        .max(255)
        .optional()
        .describe(
          'Unique SKU; generated when omitted on create. Empty string on update keeps the existing SKU'
        ),
      barcode: z.string().max(255).optional().describe('Primary barcode'),
      photoUrl: z
        .string()
        .max(2048)
        .optional()
        .describe('Public photo URL; empty string clears the photo on update'),
      cost: z
        .string()
        .optional()
        .describe('Decimal cost, up to 3 decimal places and magnitude 999999999.999'),
      price: z
        .string()
        .optional()
        .describe('Decimal selling price, up to 3 decimal places and magnitude 999999999.999'),
      attributes: z
        .array(
          z.object({
            attributeId: z.number().describe('Attribute ID from list_attributes'),
            value: z
              .union([z.string(), z.number(), z.null()])
              .describe('Typed value; null removes an attribute on update only')
          })
        )
        .optional(),
      quantity: z
        .number()
        .optional()
        .describe('Create only: nonzero initial stock quantity; omit to start without stock'),
      locationId: z
        .number()
        .optional()
        .describe(
          'Create only: initial-stock location from list_locations; required with quantity when multiple locations exist'
        )
    })
  )
  .output(
    z.object({
      action: z.enum(['create', 'update', 'delete']),
      itemId: z.number(),
      raw: z.unknown().optional().describe('Original operation response returned by BoxHero')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let body = pickDefined({
      name: input.name,
      sku: input.sku,
      barcode: input.barcode,
      photo_url: input.photoUrl,
      cost: input.cost,
      price: input.price,
      attrs: input.attributes?.map(attribute => ({
        id: attribute.attributeId,
        value: attribute.value
      }))
    });
    if (input.action === 'create') {
      if (!input.name?.trim())
        throw createApiServiceError('name is required to create an item.');
      if (input.itemId !== undefined)
        throw createApiServiceError('itemId is not used when creating an item.');
      if (input.sku === '')
        throw createApiServiceError(
          'Omit sku to generate one, or provide a nonempty unique SKU.'
        );
      if (
        input.quantity !== undefined &&
        (!Number.isFinite(input.quantity) || input.quantity === 0)
      )
        throw createApiServiceError('Initial quantity must be a nonzero finite number.');
      if (input.locationId !== undefined && input.quantity === undefined)
        throw createApiServiceError('locationId seeds initial stock and requires quantity.');
      if (input.attributes?.some(attribute => attribute.value === null))
        throw createApiServiceError(
          'Attribute values cannot be null on create; omit unused attributes.'
        );
    } else {
      if (input.itemId === undefined)
        throw createApiServiceError(
          'itemId is required for update/delete. Call list_items to discover IDs.'
        );
      if (input.quantity !== undefined || input.locationId !== undefined)
        throw createApiServiceError(
          'quantity and locationId are create-only; use create_transaction to change stock.'
        );
      if (input.action === 'delete' && Object.keys(body).length > 0)
        throw createApiServiceError('Delete accepts only action and itemId.');
      if (input.action === 'update' && Object.keys(body).length === 0)
        throw createApiServiceError('Provide at least one item field to update.');
    }
    if (input.name !== undefined && !input.name.trim())
      throw createApiServiceError('name must contain a non-whitespace character.');
    for (let [label, value] of Object.entries({ cost: input.cost, price: input.price })) {
      if (
        value !== undefined &&
        (!/^-?\d+(?:\.\d{1,3})?$/.test(value) ||
          !Number.isFinite(Number(value)) ||
          Math.abs(Number(value)) > 999_999_999.999)
      )
        throw createApiServiceError(
          `${label} must be a decimal string within +/-999999999.999, with at most 3 decimal places.`
        );
    }
    input.attributes?.forEach(attribute => validateId(attribute.attributeId, 'attributeId'));
    if (
      input.attributes &&
      new Set(input.attributes.map(attribute => attribute.attributeId)).size !==
        input.attributes.length
    )
      throw createApiServiceError('Each attributeId may appear only once.');
    let client = new Client({ token: ctx.auth.token });
    let result: unknown;
    let itemId: number;
    if (input.action === 'create') {
      let created = await client.createItem(
        pickDefined({ ...body, quantity: input.quantity }),
        input.locationId
      );
      result = created;
      itemId = created.id;
    } else {
      if (input.itemId === undefined) throw createApiServiceError('itemId is required.');
      itemId = input.itemId;
      result =
        input.action === 'update'
          ? await client.updateItem(itemId, body)
          : await client.deleteItem(itemId);
    }
    return {
      output: { action: input.action, itemId, raw: result },
      message: `Item ${itemId}: ${input.action} completed.`
    };
  })
  .build();
