import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let signerEvents = SlateTrigger.create(spec, {
  name: 'Signer Events',
  key: 'signer_events',
  description:
    'Triggered when a signer event occurs: signer viewed, signer signed, signer declined, mobile update requested, or SMS received. Configure the webhook URL in your eSignatures dashboard or per-contract.'
})
  .input(
    z.object({
      eventStatus: z.string().describe('The webhook event status type'),
      contractId: z.string().describe('ID of the contract'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      contractId: z.string().describe('ID of the contract'),
      contractTitle: z.string().optional().describe('Title of the contract'),
      contractMetadata: z.string().optional().describe('Custom metadata of the contract'),
      signerId: z.string().optional().describe('ID of the signer'),
      signerName: z.string().optional().describe('Name of the signer'),
      signerEmail: z.string().optional().describe('Email of the signer'),
      signerMobile: z.string().optional().describe('Mobile number of the signer'),
      signerCompanyName: z.string().optional().describe('Company name of the signer'),
      signerFieldValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Values entered by the signer (for signer-signed events)'),
      reasonForDecline: z
        .string()
        .optional()
        .describe('Reason the signer declined (for signer-declined events)'),
      mobileNew: z
        .string()
        .optional()
        .describe('Requested new mobile number (for mobile-update-request events)'),
      smsText: z
        .string()
        .optional()
        .describe('Text of the incoming SMS (for sms-incoming events)'),
      smsMobileFrom: z
        .string()
        .optional()
        .describe('Mobile number the SMS was sent from (for sms-incoming events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let status = body?.status || '';

      let signerStatuses = [
        'signer-viewed-the-contract',
        'signer-signed',
        'signer-declined',
        'signer-mobile-update-request',
        'sms-incoming'
      ];

      if (!signerStatuses.includes(status)) {
        return { inputs: [] };
      }

      let contractId = body?.data?.contract?.id || '';

      return {
        inputs: [
          {
            eventStatus: status,
            contractId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventStatus, contractId, rawPayload } = ctx.input;
      let data = rawPayload?.data || {};
      let signer = data?.signer || {};
      let contract = data?.contract || {};

      let eventType = eventStatus.replace(/-/g, '_');

      return {
        type: `signer.${eventType}`,
        id: `${contractId}-${signer.id || 'unknown'}-${eventStatus}-${Date.now()}`,
        output: {
          contractId: contract?.id || contractId,
          contractTitle: contract?.title,
          contractMetadata: contract?.metadata,
          signerId: signer?.id,
          signerName: signer?.name,
          signerEmail: signer?.email,
          signerMobile: signer?.mobile,
          signerCompanyName: signer?.company_name,
          signerFieldValues: signer?.signer_field_values,
          reasonForDecline: data?.reason_for_decline,
          mobileNew: data?.mobile_new,
          smsText: data?.sms?.sms_text,
          smsMobileFrom: data?.sms?.mobile_from
        }
      };
    }
  })
  .build();
