import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { resolveOrganizationId } from '../lib/organization';
import { spec } from '../spec';

let reportPaths = {
  scan_count: 'scans/count',
  unique_scanners: 'scanners/unique',
  scans_per_qr_code: 'scans/list',
  country_distribution: 'scans/country',
  device_distribution: 'scans/device-os',
  period_overview: 'period-overview'
} as const;
export let getQrAnalytics = SlateTool.create(spec, {
  key: 'get_qr_analytics',
  name: 'Get QR Code Analytics',
  description:
    'Query the current QR Code Analytics API for scan counts, unique scanners, per-code scans, countries, devices, or a period overview. Returns the actual report including provider pagination when present.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      report: z.enum([
        'scan_count',
        'unique_scanners',
        'scans_per_qr_code',
        'country_distribution',
        'device_distribution',
        'period_overview'
      ]),
      organizationId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Organization ID from list_organizations; uses the configured default if omitted'
        ),
      fromTimestamp: z.number().int().describe('Start of the window in epoch milliseconds'),
      toTimestamp: z.number().int().describe('End of the window in epoch milliseconds'),
      qrCodeIds: z.array(z.number().int().positive()).optional(),
      hideAnomalies: z.boolean().optional(),
      deviceOs: z
        .array(z.enum(['iPhone', 'android', 'iPad OS', 'windows', 'mac', 'Other', 'others']))
        .optional(),
      location: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Documented location filter with lists of country, region, or city values'),
      periodicRequest: z
        .boolean()
        .optional()
        .describe('For period_overview, compute unique_user_count with an extra aggregation'),
      includeAllQrTypes: z
        .boolean()
        .optional()
        .describe('For period_overview, include GS1 and standard codes')
    })
  )
  .output(z.object({ raw: z.unknown().describe('Complete provider report response') }))
  .handleInvocation(async ctx => {
    if (ctx.input.fromTimestamp > ctx.input.toTimestamp) {
      throw createApiServiceError('fromTimestamp must be no later than toTimestamp.');
    }
    if (
      ctx.input.report !== 'period_overview' &&
      (ctx.input.periodicRequest !== undefined || ctx.input.includeAllQrTypes !== undefined)
    ) {
      throw createApiServiceError(
        'periodicRequest and includeAllQrTypes apply only to period_overview.'
      );
    }
    let organization = resolveOrganizationId(
      ctx.input.organizationId,
      ctx.config.organizationId
    );
    let raw = await new BeaconstacClient(ctx.auth).getQrAnalytics(
      organization,
      reportPaths[ctx.input.report],
      {
        from_timestamp: ctx.input.fromTimestamp,
        to_timestamp: ctx.input.toTimestamp,
        product_ids: ctx.input.qrCodeIds,
        hide_anomalies: ctx.input.hideAnomalies,
        device_os: ctx.input.deviceOs,
        location: ctx.input.location,
        periodic_request: ctx.input.periodicRequest,
        include_all_qr_types: ctx.input.includeAllQrTypes
      }
    );
    return { output: { raw }, message: 'Retrieved the QR code analytics report.' };
  })
  .build();
