import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _signatureRequestEventTypes = [
  'signature_request_sent',
  'signature_request_viewed',
  'signature_request_signed',
  'signature_request_all_signed',
  'signature_request_declined',
  'signature_request_reassigned',
  'signature_request_remind',
  'signature_request_downloadable',
  'signature_request_email_bounce',
  'signature_request_canceled',
  'signature_request_expired',
  'signature_request_prepared',
  'signature_request_signer_removed',
  'signature_request_invalid'
] as const;

export let signatureRequestEvents = SlateTrigger.create(spec, {
  name: 'Signature Request Events',
  key: 'signature_request_events',
  description:
    'Triggers when signature request events occur, such as when a request is sent, viewed, signed, completed, declined, or canceled.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('The type of event (e.g. signature_request_sent, signature_request_signed)'),
      eventTime: z.string().describe('Unix timestamp when the event occurred'),
      eventHash: z.string().describe('HMAC hash for event verification'),
      signatureRequestId: z.string().describe('ID of the signature request'),
      relatedSignatureId: z
        .string()
        .optional()
        .describe('ID of the related signature (signer)'),
      reportedForAccountId: z
        .string()
        .optional()
        .describe('Account ID this event is reported for'),
      signatureRequest: z
        .any()
        .describe('Full signature request object from the event payload')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request'),
      title: z.string().optional().describe('Title of the signature request'),
      subject: z.string().optional().describe('Subject of the request'),
      isComplete: z.boolean().describe('Whether all signers have completed'),
      isDeclined: z.boolean().describe('Whether any signer has declined'),
      hasError: z.boolean().describe('Whether there are errors'),
      requesterEmailAddress: z.string().optional().describe('Email of the requester'),
      relatedSignatureId: z
        .string()
        .optional()
        .describe('ID of the signer whose action triggered this event'),
      relatedSignerEmail: z
        .string()
        .optional()
        .describe('Email of the signer whose action triggered this event'),
      relatedSignerName: z
        .string()
        .optional()
        .describe('Name of the signer whose action triggered this event'),
      relatedSignerStatus: z
        .string()
        .optional()
        .describe('Status of the signer whose action triggered this event'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata attached to the request'),
      signatures: z
        .array(
          z.object({
            signatureId: z.string().describe('Signature ID'),
            signerEmailAddress: z.string().describe('Signer email'),
            signerName: z.string().describe('Signer name'),
            statusCode: z.string().describe('Status code'),
            signedAt: z.string().optional().describe('When the signer signed (ISO 8601)')
          })
        )
        .describe('All signers and their statuses')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      // Get current account to preserve existing settings
      let account = await client.getAccount();
      let previousCallbackUrl = account.callback_url || null;

      // Set the callback URL to our webhook URL
      await client.updateAccount({ callbackUrl: ctx.input.webhookBaseUrl });

      return {
        registrationDetails: {
          previousCallbackUrl
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        authMethod: ctx.auth.authMethod
      });

      // Restore the previous callback URL (or clear it)
      let previousUrl = ctx.input.registrationDetails?.previousCallbackUrl || '';
      await client.updateAccount({ callbackUrl: previousUrl });
    },

    handleRequest: async ctx => {
      // HelloSign sends events as multipart/form-data with a "json" field
      // or as JSON directly
      let rawData: any;

      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        rawData = await ctx.request.json();
      } else {
        // For multipart/form-data, try to parse the body as text and extract JSON
        let text = await ctx.request.text();

        // Try to find the JSON data in the multipart body
        let jsonMatch = text.match(/name="json"\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\s*$)/);
        if (jsonMatch?.[1]) {
          rawData = JSON.parse(jsonMatch[1].trim());
        } else {
          // Fallback: try parsing entire text as JSON
          try {
            rawData = JSON.parse(text);
          } catch {
            // Return empty to acknowledge but skip processing
            return { inputs: [] };
          }
        }
      }

      let event = rawData?.event;
      if (!event) {
        return { inputs: [] };
      }

      let eventType = event.event_type;

      // Filter: only process signature request events
      if (!eventType?.startsWith('signature_request_')) {
        return { inputs: [] };
      }

      let signatureRequest = rawData.signature_request;
      if (!signatureRequest) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTime: String(event.event_time),
            eventHash: event.event_hash,
            signatureRequestId: signatureRequest.signature_request_id,
            relatedSignatureId: event.event_metadata?.related_signature_id,
            reportedForAccountId: event.event_metadata?.reported_for_account_id,
            signatureRequest
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let sr = ctx.input.signatureRequest;
      let signatures = (sr.signatures || []).map((s: any) => ({
        signatureId: s.signature_id,
        signerEmailAddress: s.signer_email_address,
        signerName: s.signer_name,
        statusCode: s.status_code,
        signedAt: s.signed_at ? new Date(s.signed_at * 1000).toISOString() : undefined
      }));

      // Find the related signer if we have a related signature ID
      let relatedSigner = ctx.input.relatedSignatureId
        ? signatures.find((s: any) => s.signatureId === ctx.input.relatedSignatureId)
        : undefined;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.signatureRequestId}_${ctx.input.eventType}_${ctx.input.eventTime}`,
        output: {
          signatureRequestId: sr.signature_request_id,
          title: sr.title || undefined,
          subject: sr.subject || undefined,
          isComplete: sr.is_complete ?? false,
          isDeclined: sr.is_declined ?? false,
          hasError: sr.has_error ?? false,
          requesterEmailAddress: sr.requester_email_address || undefined,
          relatedSignatureId: ctx.input.relatedSignatureId,
          relatedSignerEmail: relatedSigner?.signerEmailAddress,
          relatedSignerName: relatedSigner?.signerName,
          relatedSignerStatus: relatedSigner?.statusCode,
          metadata: sr.metadata || undefined,
          signatures
        }
      };
    }
  })
  .build();
