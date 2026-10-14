import { z } from 'zod';

export let financialItemSchema = z.object({
  name: z.string().describe('Line item name'),
  quantity: z.number().describe('Line item quantity'),
  price: z.number().describe('Price per unit; negative values may represent discounts'),
  productId: z.string().optional().describe('Product or line item ID'),
  description: z.string().optional().describe('Line item description'),
  unitOfMeasure: z.string().optional().describe('Unit of measure, such as Items'),
  itemType: z.string().optional().describe('Item type, such as material'),
  cost: z.number().optional().describe('Cost per unit')
});

export let financialItemPayload = (item: z.infer<typeof financialItemSchema>) => ({
  name: item.name,
  quantity: item.quantity,
  price: item.price,
  jnid: item.productId,
  description: item.description,
  uom: item.unitOfMeasure,
  item_type: item.itemType,
  cost: item.cost
});
