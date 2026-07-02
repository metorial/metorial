import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn()
}));

vi.mock('./lib/helpers', () => ({
  createClientFromContext: vi.fn(() => clientMocks)
}));

import { finagoListProducts, finagoUpsertProduct } from './tools/products';

let invokeListProducts = (input: unknown) =>
  finagoListProducts.handleInvocation({
    auth: { token: 'token' },
    input
  } as any);

let createCtx = (input: Record<string, unknown>) =>
  ({
    auth: { token: 'token' },
    config: {},
    input
  }) as any;

beforeEach(() => {
  clientMocks.post.mockReset();
  clientMocks.patch.mockReset();
  clientMocks.post.mockResolvedValue({ id: 123, name: 'White shoe laces' });
  clientMocks.patch.mockResolvedValue({ id: 123, name: 'Updated shoe laces' });
});

describe('Finago product tool validation', () => {
  it('rejects list filters when reading one product by ID', async () => {
    await expect(
      invokeListProducts({ productId: 123, productSearch: 'shoe' })
    ).rejects.toBeInstanceOf(ServiceError);

    await expect(invokeListProducts({ productId: 123, maxPages: 1 })).rejects.toThrow(
      'productId cannot be combined with list filters'
    );
  });

  it('rejects malformed comma-separated ID filters', async () => {
    await expect(invokeListProducts({ categoryIds: '12,abc' })).rejects.toBeInstanceOf(
      ServiceError
    );

    await expect(invokeListProducts({ supplierIds: '0' })).rejects.toBeInstanceOf(
      ServiceError
    );
  });
});

describe('Finago upsert product', () => {
  it('creates products with documented nested request body fields', async () => {
    await finagoUpsertProduct.handleInvocation(
      createCtx({
        operation: 'create',
        name: 'White shoe laces',
        number: 'SH-1234567',
        type: 'default',
        status: 'active',
        description: '1 meter long shoe laces - white',
        categoryId: 12,
        unitId: 2,
        supplierId: 67890,
        costPrice: 50,
        salesPrice: 400,
        indirectCost: 12.77,
        webshopEnabled: true,
        ean: '0123456789000',
        eanAlternative: '0123456789012345678901234',
        stockManaged: true,
        stockQuantity: 146,
        stockLocation: 'A-313',
        supplierProductItemCode: 'T1234',
        supplierProductNumber: '1234',
        supplierProductName: 'Shoe laces, white, 1m',
        supplierProductPrice: 10.5
      })
    );

    expect(clientMocks.post).toHaveBeenCalledWith(
      '/products',
      {
        name: 'White shoe laces',
        number: 'SH-1234567',
        type: 'default',
        status: 'active',
        description: '1 meter long shoe laces - white',
        costPrice: 50,
        salesPrice: 400,
        indirectCost: 12.77,
        webshopEnabled: true,
        ean: '0123456789000',
        eanAlternative: '0123456789012345678901234',
        category: { id: 12 },
        units: { id: 2 },
        supplier: { id: 67890 },
        stock: {
          isManaged: true,
          quantity: 146,
          location: 'A-313'
        },
        supplierProduct: {
          itemCode: 'T1234',
          number: '1234',
          name: 'Shoe laces, white, 1m',
          price: 10.5
        }
      },
      undefined,
      'create product'
    );
  });

  it('updates products with documented nullable clear fields', async () => {
    await finagoUpsertProduct.handleInvocation(
      createCtx({
        operation: 'update',
        productId: 123,
        number: null,
        description: null,
        costPrice: null,
        salesPrice: null,
        indirectCost: null,
        unitId: null,
        supplierId: null,
        ean: null,
        eanAlternative: null,
        stockLocation: null,
        supplierProductItemCode: null,
        supplierProductNumber: null,
        supplierProductName: null,
        supplierProductPrice: null
      })
    );

    expect(clientMocks.patch).toHaveBeenCalledWith(
      '/products/123',
      {
        number: null,
        description: null,
        costPrice: null,
        salesPrice: null,
        indirectCost: null,
        ean: null,
        eanAlternative: null,
        units: { id: null },
        supplier: { id: null },
        stock: {
          location: null
        },
        supplierProduct: {
          itemCode: null,
          number: null,
          name: null,
          price: null
        }
      },
      undefined,
      'update product'
    );
  });

  it('rejects productId when creating a product', async () => {
    await expect(
      finagoUpsertProduct.handleInvocation(
        createCtx({
          operation: 'create',
          productId: 123,
          name: 'White shoe laces',
          categoryId: 12
        })
      )
    ).rejects.toBeInstanceOf(ServiceError);

    expect(clientMocks.post).not.toHaveBeenCalled();
    expect(clientMocks.patch).not.toHaveBeenCalled();
  });
});
