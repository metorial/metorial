import { describe, expect, it } from 'vitest';
import { mapSalesOrder } from './sales-orders';

describe('SAP S/4HANA sales orders tool helpers', () => {
  it('keeps documented decimal amount fields when SAP returns numeric JSON values', () => {
    expect(
      mapSalesOrder({
        SalesOrder: '5000000001',
        TotalNetAmount: 123.45,
        to_Item: {
          results: [
            {
              SalesOrder: '5000000001',
              SalesOrderItem: '10',
              RequestedQuantity: 2.5,
              NetAmount: 123.45
            }
          ]
        }
      })
    ).toMatchObject({
      salesOrder: '5000000001',
      totalNetAmount: '123.45',
      items: [
        {
          salesOrder: '5000000001',
          salesOrderItem: '10',
          requestedQuantity: '2.5',
          netAmount: '123.45'
        }
      ]
    });
  });
});
