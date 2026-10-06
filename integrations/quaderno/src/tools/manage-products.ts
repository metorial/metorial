import { z } from 'zod';
import { mapProduct, mapProductInput, productInput, productOutput } from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  idInput,
  invalid,
  nonempty,
  pageInput,
  pageOutput,
  textInput
} from '../lib/validation';
export const listProducts = tool({
  name: 'List Products',
  key: 'list_products',
  description:
    'List a cursor page of reusable products, or retrieve one product with productId alone.',
  readOnly: true,
  input: { ...pageInput, query: z.string().optional(), productId: idInput.optional() },
  output: { products: z.array(z.object(productOutput)), ...pageOutput },
  run: async (input, client) => {
    if (input.productId) {
      if (Object.entries(input).some(([k, v]) => k !== 'productId' && v !== undefined))
        throw invalid('Use productId alone for an exact product read.');
      return { products: [mapProduct(await client.get('items', input.productId))] };
    }
    return {
      products: (await client.list('items', input, { q: input.query })).map(mapProduct),
      ...client.pagination
    };
  }
});
export const createProduct = tool({
  name: 'Create Product',
  key: 'create_product',
  description:
    'Create a reusable product with code, name and a decimal unitCost in currency major units. Supply subscription processor details when relevant.',
  input: { ...productInput, name: textInput },
  output: productOutput,
  run: async (input, client) =>
    mapProduct(await client.create('items', mapProductInput(input, true)))
});
export const updateProduct = tool({
  name: 'Update Product',
  key: 'update_product',
  description: 'Update only the supplied product fields.',
  input: { productId: idInput, ...productInput },
  output: productOutput,
  run: async (input, client) => {
    const data = mapProductInput(input);
    nonempty(data);
    const current = await client.get('items', input.productId);
    if (
      (input.taxBasedOn ?? current.tax_based_on) === 'country' &&
      !(input.country ?? current.country)
    )
      throw invalid('Provide country when selecting country-based taxation.');
    if (input.taxBasedOn === 'country' && input.country === undefined)
      data.country = current.country;
    return mapProduct(await client.update('items', input.productId, data));
  }
});
export const deleteProduct = tool({
  name: 'Delete Product',
  key: 'delete_product',
  description: 'Delete a product from the selected account.',
  destructive: true,
  input: { productId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.get('items', input.productId);
    await client.remove('items', input.productId);
    return { success: true };
  }
});
