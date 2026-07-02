import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let certcentralEvents = SlateTrigger.create(spec, {
  name: 'CertCentral Events',
  key: 'certcentral_events',
  description:
    'Receive webhook events from DigiCert CertCentral including certificate issuance, revocation, order rejection, and domain/organization validation changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type (e.g., "certificate_issued", "certificate_revoked", "order_rejected", "organization_validated", "domain_validated")'
        ),
      eventId: z.string().describe('Unique event identifier'),
      orderId: z.number().optional().describe('Associated order ID'),
      certificateId: z.number().optional().describe('Associated certificate ID'),
      organizationId: z.number().optional().describe('Associated organization ID'),
      domainId: z.number().optional().describe('Associated domain ID'),
      requestId: z.number().optional().describe('Associated request ID'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      orderId: z.number().optional().describe('Certificate order ID'),
      certificateId: z.number().optional().describe('Certificate ID'),
      commonName: z.string().optional().describe('Certificate common name / domain'),
      serialNumber: z.string().optional().describe('Certificate serial number'),
      status: z.string().optional().describe('Order or certificate status'),
      organizationId: z.number().optional().describe('Organization ID'),
      organizationName: z.string().optional().describe('Organization name'),
      domainId: z.number().optional().describe('Domain ID'),
      domainName: z.string().optional().describe('Domain name'),
      validationType: z.string().optional().describe('Validation type (ov, ev, cs, ev_cs)'),
      validUntil: z.string().optional().describe('Certificate or validation expiry date'),
      dateCreated: z.string().optional().describe('Event date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CertCentralClient({
        token: ctx.auth.token,
        platform: ctx.config.platform
      });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        event_types: [
          'certificate_issued',
          'certificate_revoked',
          'order_rejected',
          'organization_validated',
          'organization_expired',
          'organization_revalidation_notice',
          'domain_validated',
          'domain_expired',
          'domain_revalidation_notice'
        ],
        send_immediately: true
      });

      let webhookId = String(result.id);

      // Activate the webhook
      await client.activateWebhook(webhookId);

      return {
        registrationDetails: {
          webhookId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CertCentralClient({
        token: ctx.auth.token,
        platform: ctx.config.platform
      });

      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (e: any) {
          // If the webhook was already deleted, ignore the error
          if (e?.response?.status !== 404) {
            throw e;
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.event) {
        return { inputs: [] };
      }

      let event = data.event;
      let eventType = event.event_type || data.event_type;

      if (!eventType) {
        return { inputs: [] };
      }

      let eventId = `${eventType}_${event.order_id || event.organization_id || event.domain_id || ''}_${event.date || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            orderId: event.order_id,
            certificateId: event.certificate_id,
            organizationId: event.organization_id,
            domainId: event.domain_id,
            requestId: event.request_id,
            payload: event
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, payload } = ctx.input;

      let output: Record<string, any> = {};

      // Certificate events
      if (eventType === 'certificate_issued' || eventType === 'certificate_revoked') {
        output.orderId = payload.order_id;
        output.certificateId = payload.certificate_id;
        output.commonName = payload.common_name || payload.certificate?.common_name;
        output.serialNumber = payload.serial_number || payload.certificate?.serial_number;
        output.status = eventType === 'certificate_issued' ? 'issued' : 'revoked';
        output.validUntil = payload.valid_till || payload.certificate?.valid_till;
        output.dateCreated = payload.date;
      }

      // Order events
      if (eventType === 'order_rejected') {
        output.orderId = payload.order_id;
        output.commonName = payload.common_name || payload.certificate?.common_name;
        output.status = 'rejected';
        output.dateCreated = payload.date;
      }

      // Organization events
      if (
        eventType === 'organization_validated' ||
        eventType === 'organization_expired' ||
        eventType === 'organization_revalidation_notice'
      ) {
        output.organizationId = payload.organization_id || payload.organization?.id;
        output.organizationName = payload.organization_name || payload.organization?.name;
        output.validationType = payload.validation_type;
        output.validUntil = payload.validated_until || payload.expires_at;
        output.status =
          eventType === 'organization_validated'
            ? 'validated'
            : eventType === 'organization_expired'
              ? 'expired'
              : 'revalidation_needed';
        output.dateCreated = payload.date;
      }

      // Domain events
      if (
        eventType === 'domain_validated' ||
        eventType === 'domain_expired' ||
        eventType === 'domain_revalidation_notice'
      ) {
        output.domainId = payload.domain_id || payload.domain?.id;
        output.domainName = payload.domain_name || payload.domain?.name;
        output.validationType = payload.validation_type;
        output.validUntil = payload.validated_until || payload.expires_at;
        output.status =
          eventType === 'domain_validated'
            ? 'validated'
            : eventType === 'domain_expired'
              ? 'expired'
              : 'revalidation_needed';
        output.dateCreated = payload.date;
      }

      return {
        type: eventType.replace(/_/g, '.'),
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
