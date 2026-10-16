import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAppScan = SlateTool.create(spec, {
  name: 'Manage App Scans',
  key: 'manage_app_scan',
  description: `List app configurations, retrieve scan history, or create a new app scan for pass validation. App scans are used to validate passes by scanning their barcodes using the Passcreator Smart Scan companion app or programmatically via API.`,
  instructions: [
    'Use action "list_configurations" to see all available app configurations.',
    'Use action "list_scans" to retrieve scan history for a specific configuration.',
    'Use action "create_scan" to programmatically record a pass scan.',
    'Scan status codes: 0=voided after scan, 1=already voided, 2=attendance saved, 3=pass not found.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_configurations', 'get_configuration', 'list_scans', 'create_scan'])
        .describe('Action to perform'),
      appConfigurationId: z
        .string()
        .optional()
        .describe(
          'App configuration identifier (required for get_configuration, list_scans, create_scan)'
        ),
      start: z
        .number()
        .optional()
        .describe(
          'Offset for scan history pagination; use nextStart from the previous result.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe('Number of scans per page for list_scans (max 100)'),
      createdSince: z
        .string()
        .optional()
        .describe('Filter scans created since this date ("Y-m-d H:i")'),
      scan: z
        .object({
          scanStatus: z
            .number()
            .describe(
              'Scan status code (0=void, 1=already voided, 2=attendance, 3=not found)'
            ),
          passId: z.string().optional().describe('Pass identifier that was scanned'),
          scannedBarcodeValue: z.string().describe('Barcode value that was scanned'),
          deviceName: z.string().describe('Name of the scanning device'),
          createdOn: z.string().describe('Scan timestamp in "Y-m-d H:i:s" format'),
          setVoided: z
            .boolean()
            .optional()
            .describe('Whether to void the pass after scanning'),
          additionalProperties: z
            .record(z.string(), z.any())
            .optional()
            .describe('Additional scan properties')
        })
        .optional()
        .describe('Scan data (required for create_scan)')
    })
  )
  .output(
    z.object({
      configurations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of app configurations'),
      configuration: z
        .record(z.string(), z.any())
        .optional()
        .describe('Single app configuration details'),
      scans: z.array(z.record(z.string(), z.any())).optional().describe('List of app scans'),
      totalCount: z.number().optional().describe('Total number of matching scans'),
      nextStart: z
        .number()
        .optional()
        .describe('Offset to request next when more scans are available'),
      createdScan: z.record(z.string(), z.any()).optional().describe('Created scan result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list_configurations': {
        let configs = await client.listAppConfigurations();
        return {
          output: { configurations: configs },
          message: `Found **${configs.length}** app configuration(s).`
        };
      }
      case 'get_configuration': {
        if (!ctx.input.appConfigurationId)
          throw createApiServiceError('appConfigurationId is required');
        let config = await client.getAppConfiguration(ctx.input.appConfigurationId);
        return {
          output: { configuration: config },
          message: `Retrieved app configuration \`${ctx.input.appConfigurationId}\`.`
        };
      }
      case 'list_scans': {
        if (!ctx.input.appConfigurationId)
          throw createApiServiceError('appConfigurationId is required');
        let scans = await client.listAppScans(ctx.input.appConfigurationId, {
          start: ctx.input.start,
          pageSize: ctx.input.pageSize,
          createdSince: ctx.input.createdSince
        });
        let scanList = Array.isArray(scans) ? scans : (scans.results ?? scans.data ?? [scans]);
        return {
          output: {
            scans: scanList,
            totalCount: scans.total,
            nextStart: scans.query?.next
              ? (ctx.input.start ?? 0) + (scans.query?.pageSize ?? ctx.input.pageSize ?? 100)
              : undefined
          },
          message: `Found **${scanList.length}** scan(s) for configuration \`${ctx.input.appConfigurationId}\`.`
        };
      }
      case 'create_scan': {
        if (!ctx.input.appConfigurationId)
          throw createApiServiceError('appConfigurationId is required');
        if (!ctx.input.scan) throw createApiServiceError('scan data is required');
        if (
          !Number.isInteger(ctx.input.scan.scanStatus) ||
          ctx.input.scan.scanStatus < 0 ||
          ctx.input.scan.scanStatus > 3
        ) {
          throw createApiServiceError('scanStatus must be 0, 1, 2, or 3.');
        }
        if (ctx.input.scan.scanStatus !== 3 && !ctx.input.scan.passId) {
          throw createApiServiceError(
            'passId is required when the scanned pass was found (scanStatus 0, 1, or 2).'
          );
        }
        let result = await client.createAppScan({
          appConfigurationId: ctx.input.appConfigurationId,
          ...ctx.input.scan,
          passId: ctx.input.scan.passId ?? null
        });
        return {
          output: { createdScan: result },
          message: `Created scan with status ${ctx.input.scan.scanStatus} for configuration \`${ctx.input.appConfigurationId}\`.`
        };
      }
    }
  })
  .build();
