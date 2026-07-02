import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let CDC_ENTITIES = [
  'Customer',
  'Invoice',
  'Bill',
  'Item',
  'Payment',
  'Vendor',
  'Account',
  'Estimate',
  'SalesReceipt',
  'Purchase',
  'PurchaseOrder',
  'JournalEntry',
  'BillPayment',
  'CreditMemo',
  'RefundReceipt',
  'Deposit',
  'Transfer',
  'VendorCredit',
  'Class',
  'Department',
  'Employee',
  'PaymentMethod',
  'Term',
  'Budget',
  'Currency'
];

export let entityPolling = SlateTrigger.create(spec, {
  name: 'Entity Change Polling',
  key: 'entity_change_polling',
  description:
    '[Polling fallback] Polls the QuickBooks Change Data Capture (CDC) API to detect entity changes since the last poll. Covers all major entity types. Useful as a reliable fallback when webhooks may miss events.'
})
  .input(
    z.object({
      entityId: z.string().describe('ID of the changed entity'),
      entityType: z.string().describe('Type of entity'),
      operation: z.string().describe('Detected operation (updated or created)'),
      lastUpdated: z.string().describe('Timestamp of the change'),
      entitySnapshot: z.any().describe('Full entity data at time of detection')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('ID of the affected entity'),
      entityType: z.string().describe('Entity type'),
      operation: z.string().describe('Detected operation'),
      lastUpdated: z.string().describe('Timestamp of the change'),
      entitySnapshot: z.any().optional().describe('Full entity data at time of detection')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClientFromContext(ctx);

      let lastPolled = ctx.state?.lastPolled as string | undefined;
      if (!lastPolled) {
        lastPolled = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      }

      let cdcResponse = await client.getChangedEntities(CDC_ENTITIES, lastPolled);

      let inputs: any[] = [];

      let cdcResponseEntries = cdcResponse?.CDCResponse ?? [];
      for (let cdcEntry of cdcResponseEntries) {
        let queryResponse = cdcEntry?.QueryResponse ?? [];
        for (let queryResult of queryResponse) {
          for (let entityType of CDC_ENTITIES) {
            let entities = queryResult[entityType];
            if (Array.isArray(entities)) {
              for (let entity of entities) {
                let isDeleted = entity.status === 'Deleted';
                inputs.push({
                  entityId: entity.Id,
                  entityType,
                  operation: isDeleted ? 'deleted' : 'updated',
                  lastUpdated: entity.MetaData?.LastUpdatedTime ?? lastPolled,
                  entitySnapshot: isDeleted ? null : entity
                });
              }
            }
          }
        }
      }

      return {
        inputs,
        updatedState: {
          lastPolled: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let { entityId, entityType, operation, lastUpdated, entitySnapshot } = ctx.input;
      let typeLower = entityType.toLowerCase();

      return {
        type: `${typeLower}.${operation}`,
        id: `cdc-${entityType}-${entityId}-${lastUpdated}`,
        output: {
          entityId,
          entityType,
          operation,
          lastUpdated,
          entitySnapshot
        }
      };
    }
  })
  .build();
