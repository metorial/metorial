import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let billEvents = SlateTrigger.create(spec, {
  name: 'Bill Events',
  key: 'bill_events',
  description:
    'Polls for new and updated Ramp bills. Detects new bills and changes in bill status since the last poll.'
})
  .input(
    z.object({
      billId: z.string().describe('Unique ID of the bill'),
      bill: z.any().describe('Full bill object from Ramp')
    })
  )
  .output(
    z.object({
      billId: z.string().describe('Unique ID of the bill'),
      vendorId: z.string().optional().describe('Vendor ID'),
      vendorName: z.string().optional().describe('Vendor name'),
      invoiceNumber: z.string().optional().describe('Invoice number'),
      amount: z.number().optional().describe('Bill amount'),
      currency: z.string().optional().describe('Bill currency code'),
      dueDate: z.string().optional().describe('Due date (ISO 8601)'),
      status: z.string().optional().describe('Bill status'),
      paymentStatus: z.string().optional().describe('Payment status'),
      createdAt: z.string().optional().describe('Creation timestamp (ISO 8601)'),
      entityId: z.string().optional().describe('Business entity ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let result = await client.listBills({
        pageSize: 100
      });

      let knownBillIds: Record<string, string> = ctx.state?.knownBillIds || {};
      let newInputs: Array<{ billId: string; bill: any }> = [];

      for (let bill of result.data) {
        let stateKey = `${bill.id}:${bill.status || ''}:${bill.payment_status || ''}`;
        if (knownBillIds[bill.id] !== stateKey) {
          knownBillIds[bill.id] = stateKey;
          newInputs.push({ billId: bill.id, bill });
        }
      }

      return {
        inputs: newInputs,
        updatedState: {
          knownBillIds
        }
      };
    },
    handleEvent: async ctx => {
      let b = ctx.input.bill;
      let eventType = 'bill.updated';

      return {
        type: eventType,
        id: `${ctx.input.billId}:${b.status || ''}:${b.payment_status || ''}`,
        output: {
          billId: b.id,
          vendorId: b.vendor_id,
          vendorName: b.vendor_name,
          invoiceNumber: b.invoice_number,
          amount: b.amount,
          currency: b.invoice_currency || b.currency,
          dueDate: b.due_date,
          status: b.status,
          paymentStatus: b.payment_status,
          createdAt: b.created_at,
          entityId: b.entity_id
        }
      };
    }
  })
  .build();
