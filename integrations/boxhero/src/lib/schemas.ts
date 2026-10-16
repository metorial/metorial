import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let providerId = z.number().int().min(0).max(2_147_483_647);

let attributeResponse = z
  .object({
    id: providerId,
    name: z.string(),
    type: z.string(),
    value: z.union([z.string(), z.number(), z.null()])
  })
  .passthrough();

export let itemResponse = z
  .object({
    id: providerId,
    name: z.string(),
    sku: z.string(),
    barcode: z.string(),
    photo_url: z.string().nullable(),
    cost: z.string().nullable(),
    price: z.string().nullable(),
    quantity: z.number().optional(),
    quantities: z
      .array(z.object({ location_id: providerId, quantity: z.number() }).passthrough())
      .optional(),
    attrs: z.array(attributeResponse)
  })
  .passthrough();

let entityResponse = z
  .object({ id: providerId, name: z.string(), deleted: z.boolean().optional() })
  .passthrough();

export let transactionResponse = z
  .object({
    id: providerId,
    type: z.string().min(1),
    from_location: entityResponse.nullable().optional(),
    to_location: entityResponse.nullable().optional(),
    partner: entityResponse.nullable().optional(),
    items: z.array(
      z
        .object({
          id: providerId,
          name: z.string(),
          quantity: z.number(),
          deleted: z.boolean().optional(),
          from_location_new_stock_level: z.number().nullable().optional(),
          to_location_new_stock_level: z.number().nullable().optional()
        })
        .passthrough()
    ),
    transaction_time: z.iso.datetime({ offset: true }),
    created_at: z.iso.datetime({ offset: true }),
    created_by: entityResponse,
    count_of_items: z.number(),
    total_quantity: z.number(),
    memo: z.string().nullable().optional(),
    url: z.string().min(1),
    revision: z.number().optional()
  })
  .passthrough();

export let pageResponse = <T extends z.ZodType>(item: T) =>
  z
    .object({
      items: z.array(item),
      cursor: z
        .union([providerId, z.string().min(1)])
        .nullable()
        .optional(),
      has_more: z.boolean(),
      count: z.number().optional(),
      limit: z.number().optional()
    })
    .passthrough()
    .superRefine((page, ctx) => {
      if (page.has_more && page.cursor == null) {
        ctx.addIssue({
          code: 'custom',
          path: ['cursor'],
          message: 'A cursor is required when more pages exist'
        });
      }
    });

export let parseResponse = <T extends z.ZodType>(
  schema: T,
  data: unknown,
  operation: string
): z.output<T> => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    let fields = parsed.error.issues.map(issue => issue.path.join('.')).join(', ');
    throw createApiServiceError(`BoxHero returned invalid ${operation} data (${fields}).`, {
      reason: 'boxhero_invalid_response'
    });
  }
  return parsed.data;
};

export let itemSchema = z.object({
  itemId: z.number().describe('Unique identifier for the item'),
  name: z.string().describe('Item name'),
  sku: z.string().describe('Stock Keeping Unit code'),
  barcode: z.string().describe('Barcode number'),
  photoUrl: z.string().nullable().describe('URL of the item photo'),
  cost: z.string().nullable().describe('Purchase cost of the item'),
  price: z.string().nullable().describe('Selling price of the item'),
  quantity: z.number().optional().describe('Current stock quantity across selected locations'),
  attributes: z.array(
    z.object({
      attributeId: z.number().describe('Unique identifier for the attribute'),
      name: z.string().describe('Attribute name'),
      type: z.string().describe('Attribute data type (text, number, date, barcode)'),
      value: z.union([z.string(), z.number(), z.null()]).describe('Attribute value')
    })
  ),
  quantities: z
    .array(z.object({ locationId: z.number(), quantity: z.number() }))
    .optional()
    .describe('Per-location stock quantities'),
  raw: z.unknown().optional().describe('Original item data returned by BoxHero')
});

let locationSchema = z.object({
  locationId: z.number().describe('Location ID'),
  name: z.string().describe('Location name'),
  deleted: z.boolean().optional().describe('Whether the location has been deleted')
});

export let transactionSchema = z.object({
  transactionId: z.number().describe('Unique transaction ID'),
  type: z.string().describe('Transaction type: in, out, adjust, or move'),
  fromLocation: locationSchema.optional().describe('Source location (for move transactions)'),
  toLocation: locationSchema.optional().describe('Destination location'),
  items: z.array(
    z.object({
      itemId: z.number().describe('Item ID'),
      name: z.string().describe('Item name'),
      quantity: z.number().describe('Transaction quantity'),
      deleted: z.boolean().optional().describe('Whether the item has been deleted'),
      toLocationNewStockLevel: z
        .number()
        .optional()
        .describe('Destination stock after transaction'),
      fromLocationNewStockLevel: z
        .number()
        .optional()
        .describe('Source stock after transaction')
    })
  ),
  transactionTime: z.string().describe('When the transaction occurred (ISO 8601)'),
  createdAt: z.string().describe('When the transaction record was created (ISO 8601)'),
  createdBy: z.object({
    memberId: z.number().describe('Team member ID'),
    name: z.string().describe('Team member name'),
    deleted: z.boolean().optional().describe('Whether the member has been deleted')
  }),
  countOfItems: z.number().describe('Number of distinct items in the transaction'),
  totalQuantity: z.number().describe('Total quantity across all items'),
  memo: z.string().optional().describe('Optional notes attached to the transaction'),
  url: z.string().describe('Direct link to view the transaction in BoxHero'),
  revision: z.number().optional().describe('Revision number for edited transactions'),
  partner: z
    .object({ partnerId: z.number(), name: z.string(), deleted: z.boolean().optional() })
    .nullable()
    .optional(),
  raw: z.unknown().optional().describe('Original transaction data returned by BoxHero')
});

export let mapItem = (item: z.output<typeof itemResponse>) => ({
  itemId: item.id,
  name: item.name,
  sku: item.sku,
  barcode: item.barcode,
  photoUrl: item.photo_url,
  cost: item.cost,
  price: item.price,
  quantity: item.quantity,
  attributes: item.attrs.map(attr => ({
    attributeId: attr.id,
    name: attr.name,
    type: attr.type,
    value: attr.value
  })),
  quantities: item.quantities?.map(stock => ({
    locationId: stock.location_id,
    quantity: stock.quantity
  })),
  raw: item
});

export let mapTransaction = (tx: z.output<typeof transactionResponse>) => ({
  transactionId: tx.id,
  type: tx.type,
  fromLocation: tx.from_location
    ? {
        locationId: tx.from_location.id,
        name: tx.from_location.name,
        deleted: tx.from_location.deleted
      }
    : undefined,
  toLocation: tx.to_location
    ? {
        locationId: tx.to_location.id,
        name: tx.to_location.name,
        deleted: tx.to_location.deleted
      }
    : undefined,
  items: tx.items.map(item => ({
    itemId: item.id,
    name: item.name,
    quantity: item.quantity,
    deleted: item.deleted,
    toLocationNewStockLevel: item.to_location_new_stock_level ?? undefined,
    fromLocationNewStockLevel: item.from_location_new_stock_level ?? undefined
  })),
  transactionTime: tx.transaction_time,
  createdAt: tx.created_at,
  createdBy: {
    memberId: tx.created_by.id,
    name: tx.created_by.name,
    deleted: tx.created_by.deleted
  },
  countOfItems: tx.count_of_items,
  totalQuantity: tx.total_quantity,
  memo: tx.memo ?? undefined,
  url: tx.url,
  revision: tx.revision,
  partner:
    tx.partner === null
      ? null
      : tx.partner
        ? { partnerId: tx.partner.id, name: tx.partner.name, deleted: tx.partner.deleted }
        : undefined,
  raw: tx
});
