import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let licensingEvents = SlateTrigger.create(spec, {
  name: 'Licensing Events',
  key: 'licensing_events',
  description:
    'Triggered by NetLicensing webhook notifications for licensing events including customer creation, license creation, payment transactions, and warning level changes. Configure webhooks in the NetLicensing Management Console under Settings / Notifications.'
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe(
          'Event name (e.g., LICENSEE_CREATED, LICENSE_CREATED, PAYMENT_TRANSACTION_PROCESSED, WARNING_LEVEL_CHANGED)'
        ),
      timestamp: z.string().describe('Event timestamp (ISO 8601)'),
      entities: z.record(z.string(), z.any()).describe('Entity data from the event payload')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Event name'),
      timestamp: z.string().describe('Event timestamp'),
      licenseeNumber: z.string().optional().describe('Affected licensee number'),
      licenseNumber: z.string().optional().describe('Affected license number'),
      transactionNumber: z.string().optional().describe('Affected transaction number'),
      licenseeName: z.string().optional().describe('Licensee name'),
      productNumber: z.string().optional().describe('Associated product number'),
      active: z.boolean().optional().describe('Active status'),
      status: z.string().optional().describe('Transaction status if applicable'),
      warningLevel: z
        .string()
        .optional()
        .describe('Warning level (GREEN, YELLOW, RED) if applicable'),
      price: z.string().optional().describe('Price if applicable'),
      currency: z.string().optional().describe('Currency if applicable'),
      entities: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full entity data from the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let timestamp = data.timestamp || new Date().toISOString();
      let entities = data.entities || {};

      // Extract event type from the Event entity
      let eventName = 'UNKNOWN';
      if (entities.Event && Array.isArray(entities.Event)) {
        let eventEntity = entities.Event[0];
        if (eventEntity?.name) {
          eventName = eventEntity.name;
        }
      }

      return {
        inputs: [
          {
            eventName,
            timestamp,
            entities
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, timestamp, entities } = ctx.input;

      let licenseeNumber: string | undefined;
      let licenseNumber: string | undefined;
      let transactionNumber: string | undefined;
      let licenseeName: string | undefined;
      let productNumber: string | undefined;
      let active: boolean | undefined;
      let status: string | undefined;
      let warningLevel: string | undefined;
      let price: string | undefined;
      let currency: string | undefined;

      // Extract data based on event type
      if (entities.Licensee && Array.isArray(entities.Licensee)) {
        let licensee = entities.Licensee[0];
        licenseeNumber = licensee?.number;
        licenseeName = licensee?.name;
        productNumber = licensee?.productNumber;
        if (licensee?.active !== undefined) {
          active = licensee.active === true || licensee.active === 'true';
        }
      }

      if (entities.License && Array.isArray(entities.License)) {
        let license = entities.License[0];
        licenseNumber = license?.number;
        if (!licenseeNumber) licenseeNumber = license?.licenseeNumber;
        price = license?.price;
        currency = license?.currency;
      }

      if (entities.Transaction && Array.isArray(entities.Transaction)) {
        let transaction = entities.Transaction[0];
        transactionNumber = transaction?.number;
        status = transaction?.status;
        price = transaction?.price || price;
        currency = transaction?.currency || currency;
      }

      if (entities.WarningLevel) {
        let wl = entities.WarningLevel as any;
        warningLevel =
          typeof wl === 'string' ? wl : Array.isArray(wl) ? wl[0]?.level : undefined;
      }

      // Derive a unique event id
      let eventId = `${eventName}-${timestamp}-${licenseeNumber || licenseNumber || transactionNumber || 'unknown'}`;

      // Map event names to types
      let typeMap: Record<string, string> = {
        LICENSEE_CREATED: 'licensee.created',
        LICENSE_CREATED: 'license.created',
        PAYMENT_TRANSACTION_PROCESSED: 'transaction.processed',
        WARNING_LEVEL_CHANGED: 'licensee.warning_level_changed'
      };

      let type = typeMap[eventName] || `licensing.${eventName.toLowerCase()}`;

      return {
        type,
        id: eventId,
        output: {
          eventName,
          timestamp,
          licenseeNumber,
          licenseNumber,
          transactionNumber,
          licenseeName,
          productNumber,
          active,
          status,
          warningLevel,
          price,
          currency,
          entities
        }
      };
    }
  })
  .build();
