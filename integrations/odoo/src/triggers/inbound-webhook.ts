import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let odooPayloadSchema = z.record(z.string(), z.unknown());
let recordIdSchema = z.union([z.string(), z.number()]);

/**
 * Odoo's Send Webhook Notification automation action posts a configurable set
 * of record fields. Non-object JSON values retain the legacy `{ _value }` shape.
 */
export let inboundWebhook = SlateTrigger.create(spec, {
  name: 'Odoo Webhook Notification',
  key: 'inbound_webhook',
  description:
    "Receives JSON payloads sent by Odoo's Send Webhook Notification automation action. Configure the generated webhook URL in Odoo and select the record fields to include. Non-JSON bodies are exposed as raw text for troubleshooting."
})
  .input(
    z.object({
      payload: odooPayloadSchema.describe('Record fields sent by Odoo'),
      model: z.string().optional().describe('Odoo model name when included in the payload'),
      recordId: recordIdSchema
        .optional()
        .describe('Odoo record ID when included in the payload'),
      rawBody: z
        .string()
        .optional()
        .describe('Original request body when it is not valid JSON'),
      contentType: z.string().optional().describe('Content-Type header sent by Odoo')
    })
  )
  .output(
    z.object({
      payload: odooPayloadSchema.describe('Record fields sent by Odoo'),
      model: z.string().optional().describe('Odoo model name when included in the payload'),
      recordId: recordIdSchema
        .optional()
        .describe('Odoo record ID when included in the payload'),
      rawBody: z
        .string()
        .optional()
        .describe('Original request body when it is not valid JSON'),
      contentType: z.string().optional().describe('Content-Type header sent by Odoo')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let text = await ctx.request.text();
      if (!text?.trim()) {
        return {
          inputs: [{ payload: {}, contentType }]
        };
      }
      try {
        let parsed = JSON.parse(text);
        let payload =
          parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : { _value: parsed };
        let modelCandidate =
          typeof payload._model === 'string'
            ? payload._model
            : typeof payload.model === 'string'
              ? payload.model
              : undefined;
        let recordIdCandidate =
          typeof payload._id === 'string' || typeof payload._id === 'number'
            ? payload._id
            : typeof payload.id === 'string' || typeof payload.id === 'number'
              ? payload.id
              : undefined;
        return {
          inputs: [
            {
              payload,
              model: modelCandidate,
              recordId: recordIdCandidate,
              contentType
            }
          ]
        };
      } catch {
        return {
          inputs: [{ payload: {}, rawBody: text, contentType }]
        };
      }
    },

    handleEvent: async ctx => {
      return {
        type: 'webhook.inbound',
        id: `inbound-${crypto.randomUUID()}`,
        output: {
          payload: ctx.input.payload,
          model: ctx.input.model,
          recordId: ctx.input.recordId,
          rawBody: ctx.input.rawBody,
          contentType: ctx.input.contentType
        }
      };
    }
  })
  .build();
