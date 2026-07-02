import { SlateTool } from 'slates';
import { z } from 'zod';
import { NpmDownloadsClient } from '../lib/client';
import { spec } from '../spec';

export let getDownloads = SlateTool.create(spec, {
  name: 'Get Download Counts',
  key: 'get_downloads',
  description: `Retrieve download statistics for npm packages. Supports total counts for a period, day-by-day breakdowns, per-version downloads, and bulk queries for multiple packages.`,
  instructions: [
    'Use named periods like "last-day", "last-week", "last-month" or date ranges in "YYYY-MM-DD:YYYY-MM-DD" format.',
    'Bulk queries support up to 128 unscoped packages at a time.',
    'Per-version downloads are only available for the previous 7 days.',
    'Data is capped at ~18 months per request. For longer periods, split into multiple requests.'
  ],
  constraints: [
    'Scoped packages are not supported in bulk queries.',
    'Maximum 128 packages per bulk query.',
    'Data available from January 10, 2015 onwards.',
    'Maximum ~18 months of data per request.'
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
    let mode = ctx.input.mode || 'point';
    let period = ctx.input.period || 'last-week';

    if (mode === 'per-version') {
      if (!ctx.input.packageName) {
        throw new Error('packageName is required for per-version download counts.');
      }
      let data = await client.getVersionDownloads(ctx.input.packageName);
      let versionDownloads: Record<string, number> = {};
      if (data.downloads) {
        for (let [ver, count] of Object.entries(data.downloads)) {
          versionDownloads[ver] = count as number;
        }
      }
      return {
        output: {
          versionDownloads
        },
        message: `Retrieved per-version download counts for **${ctx.input.packageName}** (last 7 days). ${Object.keys(versionDownloads).length} version(s) with downloads.`
      };
    }

    if (ctx.input.packages && ctx.input.packages.length > 0) {
      if (mode === 'point') {
        let data = await client.getBulkPointDownloads(period, ctx.input.packages);
        let bulkResults: Record<
          string,
          { totalDownloads: number; start?: string; end?: string }
        > = {};
        for (let [pkg, stats] of Object.entries(data || {})) {
          let s = stats as any;
          if (s) {
            bulkResults[pkg] = {
              totalDownloads: s.downloads || 0,
              start: s.start,
              end: s.end
            };
          }
        }
        return {
          output: { bulkResults },
          message: `Retrieved bulk download counts for **${ctx.input.packages.length}** package(s) over "${period}".`
        };
      } else {
        let data = await client.getBulkRangeDownloads(period, ctx.input.packages);
        let bulkResults: Record<
          string,
          { totalDownloads: number; start?: string; end?: string }
        > = {};
        for (let [pkg, stats] of Object.entries(data || {})) {
          let s = stats as any;
          if (s) {
            let total = (s.downloads || []).reduce(
              (sum: number, d: any) => sum + (d.downloads || 0),
              0
            );
            bulkResults[pkg] = {
              totalDownloads: total,
              start: s.start,
              end: s.end
            };
          }
        }
        return {
          output: { bulkResults },
          message: `Retrieved bulk range download data for **${ctx.input.packages.length}** package(s) over "${period}".`
        };
      }
    }

    if (mode === 'point') {
      let data = await client.getPointDownloads(period, ctx.input.packageName);
      return {
        output: {
          totalDownloads: data.downloads,
          start: data.start,
          end: data.end
        },
        message: `**${ctx.input.packageName || 'All packages'}** had **${(data.downloads || 0).toLocaleString()}** downloads from ${data.start} to ${data.end}.`
      };
    }

    let data = await client.getRangeDownloads(period, ctx.input.packageName);
    let dailyDownloads = (data.downloads || []).map((d: any) => ({
      day: d.day,
      downloads: d.downloads
    }));
    let total = dailyDownloads.reduce((sum: number, d: any) => sum + d.downloads, 0);

    return {
      output: {
        totalDownloads: total,
        start: data.start,
        end: data.end,
        dailyDownloads
      },
      message: `**${ctx.input.packageName || 'All packages'}** had **${total.toLocaleString()}** total downloads from ${data.start} to ${data.end} (${dailyDownloads.length} days).`
    };
  })
  .build();
