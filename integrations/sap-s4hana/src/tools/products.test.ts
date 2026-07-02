import { describe, expect, it } from 'vitest';
import { buildProductFilters, mapProductSales } from './products';

describe('SAP S/4HANA products tool helpers', () => {
  it('maps documented product sales delivery fields', () => {
    expect(
      mapProductSales({
        ProductSalesOrg: '1010',
        ProductDistributionChnl: '10'
      })
    ).toMatchObject({
      salesOrganization: '1010',
      distributionChannel: '10'
    });
  });

  it('resolves description, plant, and sales organization filters through product ids', async () => {
    let calls: Array<{
      serviceName: string;
      entitySet: string;
      idField: string;
      filter?: string;
      top?: number;
    }> = [];

    let client = {
      queryEntityIds: async (params: (typeof calls)[number]) => {
        calls.push(params);
        if (params.entitySet === 'A_ProductDescription') return ['DESC-1'];
        if (params.entitySet === 'A_ProductPlant') return ['PLANT-1'];
        if (params.entitySet === 'A_ProductSalesDelivery') return ['SALES-1', 'SALES-2'];
        return [];
      }
    };

    let filter = await buildProductFilters(
      {
        description: 'pump',
        productType: 'FERT',
        plant: '1010',
        salesOrg: '1710'
      },
      client
    );

    expect(calls).toEqual([
      {
        serviceName: 'API_PRODUCT_SRV',
        entitySet: 'A_ProductDescription',
        idField: 'Product',
        filter: "substringof('pump', ProductDescription)",
        top: 100
      },
      {
        serviceName: 'API_PRODUCT_SRV',
        entitySet: 'A_ProductPlant',
        idField: 'Product',
        filter: "Plant eq '1010'",
        top: 100
      },
      {
        serviceName: 'API_PRODUCT_SRV',
        entitySet: 'A_ProductSalesDelivery',
        idField: 'Product',
        filter: "ProductSalesOrg eq '1710'",
        top: 100
      }
    ]);
    expect(filter).toBe(
      "ProductType eq 'FERT' and (substringof('pump', Product) or substringof('pump', ProductGroup) or Product eq 'DESC-1') and Product eq 'PLANT-1' and (Product eq 'SALES-1' or Product eq 'SALES-2')"
    );
  });

  it('returns an impossible product filter when a child entity filter has no matches', async () => {
    let client = {
      queryEntityIds: async () => []
    };

    await expect(buildProductFilters({ plant: '1010' }, client)).resolves.toBe(
      "Product eq '__slates_no_product_match__'"
    );
  });
});
