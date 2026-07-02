import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let itemOutputSchema = z
  .object({
    itemId: z.string().describe('Item ID'),
    name: z.string().describe('Item name'),
    description: z.string().nullable().describe('Item description'),
    backingType: z.string().describe('Currency or Units'),
    priceType: z.string().nullable().describe('Specified or Custom'),
    price: z.number().nullable().describe('Set price'),
    value: z.number().nullable().describe('Gift card value'),
    units: z.number().nullable().describe('Units for unit-backed items'),
    equivalentValuePerUnit: z.number().nullable().describe('Value per unit'),
    minimumPrice: z.number().nullable().describe('Minimum price (for custom pricing)'),
    maximumPrice: z.number().nullable().describe('Maximum price (for custom pricing)'),
    stockLevel: z.number().nullable().describe('Current stock level'),
    perOrderLimit: z.number().nullable().describe('Max quantity per order'),
    sku: z.string().nullable().describe('SKU'),
    groupId: z.string().nullable().describe('Group ID'),
    additionalTerms: z.string().nullable().describe('Additional terms')
  })
  .passthrough();

export let manageItem = SlateTool.create(spec, {
  name: 'Create or Update Item',
  key: 'manage_item',
  description: `Create a new item (product) for sale in the Gift Up! checkout, or update an existing item. Items define the gift card products available for purchase, including pricing, value, stock, and expiry settings.`,
  instructions: [
    'To create a new item, omit **itemId** and provide at least **name** and **backingType**.',
    'To update an existing item, provide the **itemId** along with the fields to change.'
  ]
})
  .input(
    z.object({
      itemId: z.string().optional().describe('Item ID to update (omit to create a new item)'),
      name: z.string().optional().describe('Item name'),
      description: z.string().optional().describe('Item description'),
      backingType: z.enum(['Currency', 'Units']).optional().describe('Backing type'),
      priceType: z.enum(['Specified', 'Custom']).optional().describe('Price type'),
      price: z.number().optional().describe('Price charged to purchaser'),
      value: z.number().optional().describe('Value loaded onto gift card'),
      units: z.number().optional().describe('Units for unit-backed items'),
      equivalentValuePerUnit: z.number().optional().describe('Currency value per unit'),
      minimumPrice: z.number().optional().describe('Minimum price (for custom pricing)'),
      maximumPrice: z.number().optional().describe('Maximum price (for custom pricing)'),
      availableFrom: z.string().optional().describe('Available from date (ISO 8601)'),
      availableUntil: z.string().optional().describe('Available until date (ISO 8601)'),
      overrideExpiry: z.boolean().optional().describe('Override default expiry settings'),
      expiresOn: z.string().optional().describe('Specific expiry date (ISO 8601)'),
      expiresInMonths: z.number().optional().describe('Months until expiry'),
      expiresInDays: z.number().optional().describe('Days until expiry'),
      overrideValidFrom: z
        .boolean()
        .optional()
        .describe('Override default valid-from settings'),
      validFrom: z.string().optional().describe('Specific valid-from date (ISO 8601)'),
      validFromInDays: z.number().optional().describe('Days until valid'),
      groupId: z.string().optional().describe('Group ID to assign the item to'),
      detailsURL: z.string().optional().describe('URL with more details about the item'),
      artworkURL: z.string().optional().describe('URL of artwork image'),
      stockLevel: z.number().optional().describe('Stock level (-1 for unlimited)'),
      codes: z.array(z.string()).optional().describe('Pre-generated codes to use'),
      perOrderLimit: z.number().optional().describe('Maximum quantity per order'),
      additionalTerms: z.string().optional().describe('Additional terms and conditions'),
      sku: z.string().optional().describe('SKU identifier')
    })
  )
  .output(itemOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      testMode: ctx.config.testMode
    });

    if (ctx.input.itemId) {
      // Update existing item
      let patchableFields: Record<string, string> = {
        name: '/name',
        description: '/description',
        additionalTerms: '/additionalterms',
        price: '/price',
        value: '/value',
        detailsURL: '/detailsurl',
        sku: '/sku',
        codes: '/codes',
        stockLevel: '/stocklevel',
        perOrderLimit: '/perorderlimit'
      };

      let patches: Array<{ op: string; path: string; value: any }> = [];
      for (let [key, path] of Object.entries(patchableFields)) {
        let val = (ctx.input as any)[key];
        if (val !== undefined) {
          patches.push({ op: 'replace', path, value: val });
        }
      }

      if (patches.length === 0) {
        let item = await client.getItem(ctx.input.itemId);
        return {
          output: { ...item, itemId: item.id },
          message: 'No fields provided to update.'
        };
      }

      let updated = await client.updateItem(ctx.input.itemId, patches);
      return {
        output: { ...updated, itemId: updated.id },
        message: `Updated item **${updated.name}**`
      };
    } else {
      // Create new item
      let item = await client.createItem({
        name: ctx.input.name!,
        description: ctx.input.description,
        backingType: ctx.input.backingType!,
        priceType: ctx.input.priceType,
        price: ctx.input.price,
        value: ctx.input.value,
        units: ctx.input.units,
        equivalentValuePerUnit: ctx.input.equivalentValuePerUnit,
        minimumPrice: ctx.input.minimumPrice,
        maximumPrice: ctx.input.maximumPrice,
        availableFrom: ctx.input.availableFrom,
        availableUntil: ctx.input.availableUntil,
        overrideExpiry: ctx.input.overrideExpiry,
        expiresOn: ctx.input.expiresOn,
        expiresInMonths: ctx.input.expiresInMonths,
        expiresInDays: ctx.input.expiresInDays,
        overrideValidFrom: ctx.input.overrideValidFrom,
        validFrom: ctx.input.validFrom,
        validFromInDays: ctx.input.validFromInDays,
        groupId: ctx.input.groupId,
        detailsURL: ctx.input.detailsURL,
        artworkURL: ctx.input.artworkURL,
        stockLevel: ctx.input.stockLevel,
        codes: ctx.input.codes,
        perOrderLimit: ctx.input.perOrderLimit,
        additionalTerms: ctx.input.additionalTerms,
        sku: ctx.input.sku
      });

      return {
        output: { ...item, itemId: item.id },
        message: `Created item **${item.name}** (${ctx.input.backingType})`
      };
    }
  })
  .build();
