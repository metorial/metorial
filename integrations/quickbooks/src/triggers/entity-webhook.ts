import { createHmac, timingSafeEqual } from 'node:crypto';
import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { quickBooksServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let WEBHOOK_ENTITY_NAMES: Record<string, string> = {
  account: 'Account',
  bill: 'Bill',
  billpayment: 'BillPayment',
  budget: 'Budget',
  class: 'Class',
  creditmemo: 'CreditMemo',
  currency: 'Currency',
  customer: 'Customer',
  department: 'Department',
  deposit: 'Deposit',
  employee: 'Employee',
  estimate: 'Estimate',
  invoice: 'Invoice',
  item: 'Item',
  journalcode: 'JournalCode',
  journalentry: 'JournalEntry',
  payment: 'Payment',
  paymentmethod: 'PaymentMethod',
  preferences: 'Preferences',
  purchase: 'Purchase',
  purchaseorder: 'PurchaseOrder',
  refundreceipt: 'RefundReceipt',
  salesreceipt: 'SalesReceipt',
  taxagency: 'TaxAgency',
  term: 'Term',
  timeactivity: 'TimeActivity',
  transfer: 'Transfer',
  vendor: 'Vendor',
  vendorcredit: 'VendorCredit'
};

let parseCloudEventType = (type: unknown) => {
  if (typeof type !== 'string') return undefined;

  let [, entityName, operation] = type.toLowerCase().split('.');
  if (!entityName || !operation) return undefined;

  return {
    entityType: WEBHOOK_ENTITY_NAMES[entityName] ?? entityName,
    operation
  };
};

let verifyWebhookSignature = (d: {
  body: string;
  signature: string | null;
  verifierToken?: string;
}) => {
  if (!d.verifierToken) return;

  if (!d.signature) {
    throw quickBooksServiceError('QuickBooks webhook signature header is missing.');
  }

  let expected = createHmac('sha256', d.verifierToken).update(d.body).digest('base64');
  let expectedBuffer = Buffer.from(expected);
  let actualBuffer = Buffer.from(d.signature);

  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    throw quickBooksServiceError('QuickBooks webhook signature is invalid.');
  }
};

export let entityWebhook = SlateTrigger.create(spec, {
  name: 'Entity Change Webhook',
  key: 'entity_change_webhook',
  description:
    'Receives real-time webhook notifications when QuickBooks entities are created, updated, deleted, merged, or voided. Fetches full entity details from the API after receiving the notification. Configure the webhook endpoint URL and entity subscriptions in the Intuit Developer portal.'
})
  .input(
    z.object({
      entityId: z.string().describe('ID of the changed entity'),
      entityType: z.string().describe('Type of entity (e.g., Customer, Invoice, Payment)'),
      operation: z
        .string()
        .describe('Operation performed (Create, Update, Delete, Merge, Void)'),
      lastUpdated: z.string().describe('Timestamp of the change'),
      realmId: z.string().describe('Company ID (Realm ID)')
    })
  )
  .output(
    z.object({
      entityId: z.string().describe('ID of the affected entity'),
      entityType: z.string().describe('Entity type'),
      operation: z.string().describe('Operation performed'),
      lastUpdated: z.string().describe('Timestamp of the change'),
      realmId: z.string().describe('Company ID'),
      entityDetails: z
        .any()
        .optional()
        .describe('Full entity data fetched from the API (null for deletes)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let rawBody = await ctx.request.text();
      verifyWebhookSignature({
        body: rawBody,
        signature: ctx.request.headers.get('intuit-signature'),
        verifierToken: ctx.config.webhookVerifierToken
      });

      let body: any;
      try {
        body = JSON.parse(rawBody);
      } catch {
        throw quickBooksServiceError('QuickBooks webhook payload must be valid JSON.');
      }

      let inputs: any[] = [];

      if (Array.isArray(body)) {
        for (let event of body) {
          let parsedType = parseCloudEventType(event?.type);
          if (
            !parsedType ||
            !event?.intuitentityid ||
            !event?.intuitaccountid ||
            typeof event.time !== 'string'
          ) {
            continue;
          }

          inputs.push({
            entityId: event.intuitentityid,
            entityType: parsedType.entityType,
            operation: parsedType.operation,
            lastUpdated: event.time,
            realmId: event.intuitaccountid
          });
        }

        return { inputs };
      }

      let notifications = body?.eventNotifications ?? [];
      for (let notification of notifications) {
        let realmId = notification.realmId;
        let entities = notification.dataChangeEvent?.entities ?? [];

        for (let entity of entities) {
          inputs.push({
            entityId: entity.id,
            entityType: entity.name,
            operation: entity.operation,
            lastUpdated: entity.lastUpdated,
            realmId: realmId
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { entityId, entityType, operation, lastUpdated, realmId } = ctx.input;
      let entityDetails: any = null;
      let operationLower = operation.toLowerCase();

      if (operationLower !== 'delete') {
        try {
          let client = createClientFromContext(ctx);
          let response = await client.getEntity(entityType, entityId);
          entityDetails = response?.[entityType] ?? response;
        } catch (e) {
          ctx.warn(`Could not fetch ${entityType} ${entityId}: ${e}`);
        }
      }

      let typeLower = entityType.toLowerCase();

      return {
        type: `${typeLower}.${operationLower}`,
        id: `${realmId}-${entityType}-${entityId}-${operationLower}-${lastUpdated}`,
        output: {
          entityId,
          entityType,
          operation,
          lastUpdated,
          realmId,
          entityDetails
        }
      };
    }
  })
  .build();
