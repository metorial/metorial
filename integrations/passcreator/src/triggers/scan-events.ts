import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scanEvents = SlateTrigger.create(spec, {
  name: 'Scan Events',
  key: 'scan_events',
  description:
    'Triggers when a pass is scanned with the Passcreator Smart Scan companion app or via the API.'
})
  .input(
    z.object({
      appScanId: z.string().describe('Unique identifier of the scan'),
      scanStatus: z
        .number()
        .describe(
          'Scan status code (0=voided, 1=already voided, 2=attendance, 3=not found, 4=check-in, 5=already checked in, 6=check-out, 7=not checked in)'
        ),
      passId: z.string().optional().describe('Identifier of the scanned pass'),
      passGeneratedId: z.string().optional().describe('Generated ID of the pass'),
      passUserProvidedId: z.string().optional().describe('User-provided ID of the pass'),
      passVoided: z.boolean().optional().describe('Whether the pass is voided'),
      templateId: z.string().optional().describe('Template identifier'),
      templateName: z.string().optional().describe('Template name'),
      appConfigurationId: z
        .string()
        .optional()
        .describe('App configuration used for the scan'),
      scannedBarcodeValue: z.string().optional().describe('Barcode value that was scanned'),
      deviceName: z.string().optional().describe('Name of the scanning device'),
      createdOn: z.string().optional().describe('Scan timestamp'),
      additionalPropertiesScan: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional scan properties'),
      additionalPropertiesPass: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional pass properties')
    })
  )
  .output(
    z.object({
      appScanId: z.string().describe('Scan identifier'),
      scanStatus: z.number().describe('Scan status code'),
      passId: z.string().optional().describe('Scanned pass identifier'),
      passUserProvidedId: z.string().optional().describe('User-provided pass ID'),
      passVoided: z.boolean().optional().describe('Whether the pass is voided'),
      templateId: z.string().optional().describe('Template identifier'),
      templateName: z.string().optional().describe('Template name'),
      appConfigurationId: z.string().optional().describe('App configuration ID'),
      scannedBarcodeValue: z.string().optional().describe('Scanned barcode value'),
      deviceName: z.string().optional().describe('Scanning device name'),
      createdOn: z.string().optional().describe('Scan timestamp'),
      additionalPropertiesScan: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional scan properties'),
      additionalPropertiesPass: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional pass properties')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let targetUrl = `${ctx.input.webhookBaseUrl}/app_scan_created`;
      await client.subscribeWebhook('app_scan_created', targetUrl, { retryEnabled: true });

      return {
        registrationDetails: { targetUrl }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { targetUrl: string };

      try {
        await client.unsubscribeWebhook(details.targetUrl);
      } catch {
        // Best effort cleanup
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            appScanId: body.appScanId || '',
            scanStatus: body.scanStatus ?? 0,
            passId: body.passId || undefined,
            passGeneratedId: body.passGeneratedId,
            passUserProvidedId: body.passUserProvidedId,
            passVoided: body.passVoided,
            templateId: body.passTemplateGuid,
            templateName: body.passTemplateName,
            appConfigurationId: body.appConfigurationId,
            scannedBarcodeValue: body.scannedBarcodeValue,
            deviceName: body.deviceName,
            createdOn: body.createdOn || body.createdOnUtc,
            additionalPropertiesScan: body.additionalPropertiesScan,
            additionalPropertiesPass: body.additionalPropertiesPass
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'app_scan.created',
        id:
          ctx.input.appScanId ||
          `scan-${ctx.input.passId}-${ctx.input.createdOn || Date.now()}`,
        output: {
          appScanId: ctx.input.appScanId,
          scanStatus: ctx.input.scanStatus,
          passId: ctx.input.passId,
          passUserProvidedId: ctx.input.passUserProvidedId,
          passVoided: ctx.input.passVoided,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          appConfigurationId: ctx.input.appConfigurationId,
          scannedBarcodeValue: ctx.input.scannedBarcodeValue,
          deviceName: ctx.input.deviceName,
          createdOn: ctx.input.createdOn,
          additionalPropertiesScan: ctx.input.additionalPropertiesScan,
          additionalPropertiesPass: ctx.input.additionalPropertiesPass
        }
      };
    }
  })
  .build();
