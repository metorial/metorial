import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let signerSchema = z.object({
  email: z.string().optional().describe('Signer email address.'),
  name: z.string().optional().describe('Signer name.'),
  signedAt: z.string().optional().describe('Timestamp when the signer signed.')
});

let declinedBySchema = z.object({
  email: z.string().optional().describe('Email of the signer who declined.'),
  name: z.string().optional().describe('Name of the signer who declined.'),
  signerIndex: z.number().optional().describe('Index of the signer who declined.')
});

let signingLinkSchema = z.object({
  email: z.string().optional().describe('Signer email.'),
  signingLink: z.string().optional().describe('Signing URL.')
});

export let esignEvent = SlateTrigger.create(spec, {
  name: 'E-Signature Event',
  key: 'esign_event',
  description:
    "Triggers when an e-signature event occurs, including session creation (manual delivery), session completion (all signers signed), or session declined (a signer declined). Configure the webhook URL in the automation's output settings in DocsAutomator."
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The e-signature event type (e.g., "esign.session_created", "esign.session_completed", "esign.session_declined").'
        ),
      sessionId: z.string().describe('The signing session ID.'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('The signing session ID.'),
      documentName: z.string().optional().describe('Name of the document.'),
      status: z.string().optional().describe('Session status after this event.'),
      signedPdfUrl: z
        .string()
        .optional()
        .describe('URL of the signed PDF (for completed sessions).'),
      completedAt: z.string().optional().describe('Timestamp when the session was completed.'),
      declinedAt: z.string().optional().describe('Timestamp when the session was declined.'),
      signers: z
        .array(signerSchema)
        .optional()
        .describe('Signer details (for completed sessions).'),
      declinedBy: declinedBySchema
        .optional()
        .describe('Details of the signer who declined (for declined sessions).'),
      declineReason: z
        .string()
        .optional()
        .describe('Reason provided by the signer for declining.'),
      signingLinks: z
        .array(signingLinkSchema)
        .optional()
        .describe('Signing links for manual delivery (for session_created events).'),
      fieldValues: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Field values entered during signing (for completed sessions).'),
      sourceData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Original source data from the data source.'),
      additionalParams: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom webhook parameters passed in the original API request.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventType = data.event || 'esign.unknown';
      let sessionId = data.sessionId || '';

      return {
        inputs: [
          {
            eventType,
            sessionId,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload as Record<string, any>;

      let output: Record<string, unknown> = {
        sessionId: ctx.input.sessionId,
        documentName: payload.documentName,
        status: payload.status,
        additionalParams: payload.additionalParams,
        sourceData: payload.sourceData
      };

      if (payload.signedPdfUrl) output.signedPdfUrl = payload.signedPdfUrl;
      if (payload.completedAt) output.completedAt = payload.completedAt;
      if (payload.declinedAt) output.declinedAt = payload.declinedAt;

      if (payload.signers) {
        output.signers = payload.signers.map((s: any) => ({
          email: s.email,
          name: s.name,
          signedAt: s.signedAt
        }));
      }

      if (payload.declinedBy) {
        output.declinedBy = {
          email: payload.declinedBy.email,
          name: payload.declinedBy.name,
          signerIndex: payload.declinedBy.signerIndex
        };
      }

      if (payload.reason) output.declineReason = payload.reason;
      if (payload.signingLinks) output.signingLinks = payload.signingLinks;
      if (payload.fieldValues) output.fieldValues = payload.fieldValues;

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.sessionId}-${ctx.input.eventType}`,
        output: output as any
      };
    }
  })
  .build();
