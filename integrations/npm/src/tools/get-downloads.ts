import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { NpmDownloadsClient } from '../lib/client';
import { array, number, optionalText, record, text } from '../lib/response';
import { spec } from '../spec';

export let getDownloads = SlateTool.create(spec, {
  name: 'Get Download Counts',
  key: 'get_downloads',
  description: `Retrieve download statistics for npm packages. Supports total counts for a period, day-by-day breakdowns, per-version downloads, and bulk queries for multiple packages.`,
  instructions: [
    'Use named periods like "last-day", "last-week", "last-month" or date ranges in "YYYY-MM-DD:YYYY-MM-DD" format.',
    'Bulk queries support up to 128 unscoped packages at a time.',
    'Per-version downloads are only available for the previous 7 days.',
    'Bulk queries allow at most 365 days; other point/range queries allow at most 18 months. Split longer periods into multiple requests.'
  ],
  constraints: [
    'Scoped packages are not supported in bulk queries.',
    'Maximum 128 packages per bulk query.',
    'Data available from January 10, 2015 onwards.',
    'Maximum 365 days per bulk query; 18 months for other point/range queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      packageName: z
        .string()
        .optional()
        .describe(
          'Package name. Omit for aggregate counts across all npm packages. Required for per-version mode.'
        ),
      period: z
        .string()
        .optional()
        .describe(
          'Time period: "last-day", "last-week", "last-month", or a date range "YYYY-MM-DD:YYYY-MM-DD". Defaults to "last-week". Ignored for per-version mode.'
        ),
      mode: z
        .enum(['point', 'range', 'per-version'])
        .optional()
        .describe(
          'Download count mode. "point" returns total count, "range" returns day-by-day breakdown, "per-version" returns downloads by version for the last 7 days. Defaults to "point".'
        ),
      packages: z
        .array(z.string())
        .optional()
        .describe(
          'List of package names for bulk query (up to 128). Overrides packageName if provided.'
        )
    })
  )
  .output(
    z.object({
      rawDownloads: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Unmodified provider response, including null entries for unavailable bulk packages'
        ),
      totalDownloads: z
        .number()
        .optional()
        .describe('Total downloads in the period (point mode)'),
      start: z.string().optional().describe('Start date of the period'),
      end: z.string().optional().describe('End date of the period'),
      dailyDownloads: z
        .array(
          z.object({
            day: z.string().describe('Date in YYYY-MM-DD format'),
            downloads: z.number().describe('Download count for the day')
          })
        )
        .optional()
        .describe('Day-by-day download breakdown (range mode)'),
      versionDownloads: z
        .record(z.string(), z.number())
        .optional()
        .describe('Downloads per version for the last 7 days (per-version mode)'),
      bulkResults: z
        .record(
          z.string(),
          z.object({
            totalDownloads: z.number().describe('Total downloads'),
            start: z.string().optional(),
            end: z.string().optional()
          })
        )
        .optional()
        .describe('Per-package results for bulk queries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NpmDownloadsClient();
    let mode = ctx.input.mode ?? 'point';
    let period = ctx.input.period ?? 'last-week';
    if (
      !/^(last-(day|week|month|year)|\d{4}-\d{2}-\d{2}(:\d{4}-\d{2}-\d{2})?)$/.test(period) &&
      mode !== 'per-version'
    ) {
      throw createApiServiceError(
        'period must be last-day, last-week, last-month, last-year, a date, or a date range.'
      );
    }
    if (mode === 'per-version') {
      if (!ctx.input.packageName)
        throw createApiServiceError(
          'packageName is required for per-version download counts.'
        );
      if (ctx.input.packages?.length)
        throw createApiServiceError(
          'Bulk packages cannot be used with per-version mode. Use packageName.'
        );
      let data = record(
        await client.getVersionDownloads(ctx.input.packageName),
        'version downloads'
      );
      let versionDownloads = Object.fromEntries(
        Object.entries(record(data.downloads, 'version download counts')).map(
          ([version, count]) => [version, number(count, 'version download count')]
        )
      );
      return {
        output: { versionDownloads, rawDownloads: data },
        message: `Retrieved per-version download counts for **${ctx.input.packageName}** (last 7 days).`
      };
    }
    if (ctx.input.packages !== undefined) {
      if (ctx.input.packages.length === 0 || ctx.input.packages.length > 128)
        throw createApiServiceError('Provide between 1 and 128 packages for a bulk query.');
      if (ctx.input.packages.some(pkg => !pkg || pkg.startsWith('@')))
        throw createApiServiceError(
          'Bulk download queries require non-empty unscoped package names.'
        );
      let response =
        mode === 'point'
          ? await client.getBulkPointDownloads(period, ctx.input.packages)
          : await client.getBulkRangeDownloads(period, ctx.input.packages);
      let data = record(response, 'bulk download response');
      // A single name uses the ordinary endpoint response, rather than a package map.
      let results =
        ctx.input.packages.length === 1 ? { [ctx.input.packages[0]!]: data } : data;
      let bulkResults: Record<
        string,
        { totalDownloads: number; start?: string; end?: string }
      > = {};
      for (let [pkg, value] of Object.entries(results)) {
        if (value === null) continue;
        let stats = record(value, 'bulk package statistics');
        bulkResults[pkg] = {
          totalDownloads:
            mode === 'point'
              ? number(stats.downloads, 'package downloads')
              : daily(stats.downloads).reduce((sum, item) => sum + item.downloads, 0),
          start: optionalText(stats.start, 'download start date'),
          end: optionalText(stats.end, 'download end date')
        };
      }
      return {
        output: { bulkResults, rawDownloads: data },
        message: `Retrieved download data for **${Object.keys(bulkResults).length}** of **${ctx.input.packages.length}** package(s) over "${period}". Unavailable package results remain in the provider response.`
      };
    }
    let data = record(
      mode === 'point'
        ? await client.getPointDownloads(period, ctx.input.packageName)
        : await client.getRangeDownloads(period, ctx.input.packageName),
      'download statistics'
    );
    let dailyDownloads = mode === 'range' ? daily(data.downloads) : undefined;
    let totalDownloads = dailyDownloads
      ? dailyDownloads.reduce((sum, item) => sum + item.downloads, 0)
      : number(data.downloads, 'download count');
    return {
      output: {
        totalDownloads,
        start: optionalText(data.start, 'download start date'),
        end: optionalText(data.end, 'download end date'),
        dailyDownloads,
        rawDownloads: data
      },
      message: `**${ctx.input.packageName ?? 'All packages'}** had **${totalDownloads.toLocaleString()}** downloads over "${period}".`
    };
  })
  .build();

function daily(value: unknown) {
  return array(value, 'daily downloads').map(item => {
    let row = record(item, 'daily download row');
    return {
      day: text(row.day, 'download date'),
      downloads: number(row.downloads, 'daily download count')
    };
  });
}
