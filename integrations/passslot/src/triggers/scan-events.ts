import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let scanEvents = SlateTrigger.create(spec, {
  name: 'Scan Events',
  key: 'scan_events',
  description:
    'Triggers when a pass is scanned using the PassSlot redemption system. Includes scan, redeem, reactivate, and field update actions. Configure the webhook URL in the PassSlot dashboard webhooks section.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      scannerId: z.string().optional().describe('ID of the scanner that performed the scan'),
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID'),
      scanAction: z
        .string()
        .optional()
        .describe('Action performed: scan, redeem, reactivate, or update'),
      scanTimestamp: z.string().optional().describe('Timestamp of the scan'),
      authorized: z.boolean().optional().describe('Whether the scan was authorized'),
      fieldUpdates: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field update details if action was update')
    })
  )
  .output(
    z.object({
      scannerId: z.string().optional().describe('ID of the scanner that performed the scan'),
      serialNumber: z.string().describe('Pass serial number'),
      passTypeIdentifier: z.string().describe('Pass type identifier'),
      templateId: z.number().optional().describe('Template ID'),
      scanAction: z
        .string()
        .optional()
        .describe('Action performed: scan, redeem, reactivate, or update'),
      scanTimestamp: z.string().optional().describe('Timestamp of the scan'),
      authorized: z.boolean().optional().describe('Whether the scan was authorized'),
      fieldUpdates: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field update details if action was update')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let rawType = body.type || body.event;
      if (rawType !== 'scan.performed') {
        return { inputs: [] };
      }

      let data = body.data || body;

      return {
        inputs: [
          {
            eventId:
              body.id || `scan_${data.serialNumber || data.serial_number}_${Date.now()}`,
            scannerId: data.scannerId || data.scanner_id,
            serialNumber: data.serialNumber || data.serial_number || '',
            passTypeIdentifier: data.passTypeIdentifier || data.pass_type_identifier || '',
            templateId: data.templateId || data.template_id,
            scanAction: data.action || data.scanAction,
            scanTimestamp: data.timestamp || data.scannedAt || data.scanned_at,
            authorized: data.authorized,
            fieldUpdates: data.fieldUpdates || data.field_updates
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'scan.performed',
        id: ctx.input.eventId,
        output: {
          scannerId: ctx.input.scannerId,
          serialNumber: ctx.input.serialNumber,
          passTypeIdentifier: ctx.input.passTypeIdentifier,
          templateId: ctx.input.templateId,
          scanAction: ctx.input.scanAction,
          scanTimestamp: ctx.input.scanTimestamp,
          authorized: ctx.input.authorized,
          fieldUpdates: ctx.input.fieldUpdates
        }
      };
    }
  })
  .build();
