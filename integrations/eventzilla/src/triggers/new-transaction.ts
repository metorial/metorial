import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTransactionTrigger = SlateTrigger.create(spec, {
  name: 'New Transaction',
  key: 'new_transaction',
  description: 'Triggers when a new transaction is created for an event.'
})
  .input(
    z.object({
      checkoutId: z.number().describe('Checkout ID'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      transactionDate: z.string().optional().describe('Transaction date'),
      transactionAmount: z.string().optional().describe('Transaction amount'),
      transactionStatus: z.string().optional().describe('Transaction status'),
      eventId: z.number().optional().describe('Event ID'),
      eventTitle: z.string().optional().describe('Event title'),
      buyerFirstName: z.string().optional().describe('Buyer first name'),
      buyerLastName: z.string().optional().describe('Buyer last name'),
      email: z.string().optional().describe('Buyer email'),
      paymentType: z.string().optional().describe('Payment type')
    })
  )
  .output(
    z.object({
      checkoutId: z.number().describe('Checkout ID'),
      transactionRef: z.string().optional().describe('Transaction reference'),
      transactionDate: z.string().optional().describe('Transaction date'),
      transactionAmount: z.string().optional().describe('Transaction amount'),
      transactionStatus: z.string().optional().describe('Transaction status'),
      eventId: z.number().optional().describe('Event ID'),
      eventTitle: z.string().optional().describe('Event title'),
      buyerFirstName: z.string().optional().describe('Buyer first name'),
      buyerLastName: z.string().optional().describe('Buyer last name'),
      email: z.string().optional().describe('Buyer email'),
      paymentType: z.string().optional().describe('Payment type')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let knownCheckoutIds: Record<string, boolean> =
        (ctx.state?.knownCheckoutIds as Record<string, boolean>) ?? {};
      let eventIds: string[] = (ctx.state?.eventIds as string[]) ?? [];

      // On first poll, discover events
      if (eventIds.length === 0) {
        let eventsData = await client.listEvents({ status: 'live', limit: 50 });
        let events = Array.isArray(eventsData?.events)
          ? eventsData.events
          : Array.isArray(eventsData)
            ? eventsData
            : [];
        eventIds = events.map((e: any) => String(e.id));
      }

      let newTransactions: any[] = [];

      for (let eventId of eventIds) {
        try {
          let data = await client.listEventTransactions(eventId, { limit: 50 });
          let transactions = Array.isArray(data?.transactions)
            ? data.transactions
            : Array.isArray(data)
              ? data
              : [];

          for (let t of transactions) {
            let id = String(t.checkout_id);
            if (!knownCheckoutIds[id]) {
              knownCheckoutIds[id] = true;
              // Only emit if not the initial seed poll
              if (ctx.state?.initialized) {
                newTransactions.push({
                  checkoutId: t.checkout_id,
                  transactionRef: t.transaction_ref,
                  transactionDate: t.transaction_date,
                  transactionAmount: t.transaction_amount,
                  transactionStatus: t.transaction_status,
                  eventId: t.event_id,
                  eventTitle: t.title,
                  buyerFirstName: t.buyer_first_name,
                  buyerLastName: t.buyer_last_name,
                  email: t.email,
                  paymentType: t.payment_type
                });
              }
            }
          }
        } catch {
          // Skip events that may have been deleted or are inaccessible
        }
      }

      return {
        inputs: newTransactions,
        updatedState: {
          knownCheckoutIds,
          eventIds,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'transaction.created',
        id: String(ctx.input.checkoutId),
        output: {
          checkoutId: ctx.input.checkoutId,
          transactionRef: ctx.input.transactionRef,
          transactionDate: ctx.input.transactionDate,
          transactionAmount: ctx.input.transactionAmount,
          transactionStatus: ctx.input.transactionStatus,
          eventId: ctx.input.eventId,
          eventTitle: ctx.input.eventTitle,
          buyerFirstName: ctx.input.buyerFirstName,
          buyerLastName: ctx.input.buyerLastName,
          email: ctx.input.email,
          paymentType: ctx.input.paymentType
        }
      };
    }
  })
  .build();
