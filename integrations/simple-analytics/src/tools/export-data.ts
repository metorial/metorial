import { SlateTool } from 'slates';
import { z } from 'zod';
import { exportDataPoints, getExportDownloadDetails } from '../lib/export';
import { spec } from '../spec';

export let exportDataTool = SlateTool.create(spec, {
  name: 'Export Raw Data',
  key: 'export_raw_data',
  description: `Export raw, unsampled analytics data points from Simple Analytics as records and a downloadable JSON file. Data points include both page views and events. Define a date range and select the fields you need. Requires both API key and User-Id authentication.`,
  instructions: [
    'Select only the fields you need to minimize response size — data is streamed directly from the database.',
    'Use the "type" parameter to limit results to only page views or only events.',
    'For hourly exports, use the format "YYYY-MM-DDTHH" for start and end (same day only).'
  ],
  constraints: [
    'Requires a User-Id in addition to the API key.',
    'Hourly exports must be within a single day.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z
        .string()
        .describe(
          'Start date string, such as YYYY-MM-DD or an API placeholder like today-30d. For absolute hourly export use YYYY-MM-DDTHH.'
        ),
      end: z
        .string()
        .describe(
          'End date string, such as YYYY-MM-DD or an API placeholder like today or yesterday. For absolute hourly export use YYYY-MM-DDTHH (same day only).'
        ),
      fields: z
        .array(
          z.enum([
            'added_iso',
            'added_unix',
            'path',
            'hostname',
            'referrer',
            'referrer_raw',
            'utm_source',
            'utm_medium',
            'utm_campaign',
            'utm_content',
            'utm_term',
            'browser_name',
            'browser_version',
            'os_name',
            'os_version',
            'device_type',
            'country_code',
            'lang_region',
            'lang_language',
            'screen_width',
            'screen_height',
            'viewport_width',
            'viewport_height',
            'scroll_percentage',
            'duration_seconds',
            'session_id',
            'document_referrer',
            'is_unique'
          ])
        )
        .describe('Fields to include in the export. Only selected fields are returned.'),
      additionalFields: z
        .array(z.string())
        .optional()
        .describe(
          'Additional export fields, including custom metadata such as metadata.project_text or scrolled_percentage.'
        ),
      type: z
        .enum(['pageviews', 'events'])
        .optional()
        .describe('Filter to only page views or only events.'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone identifier (e.g. "Europe/Amsterdam"). Defaults to UTC.'),
      includeRobots: z
        .boolean()
        .optional()
        .describe('Whether to include robot/bot traffic. Defaults to false.')
    })
  )
  .output(
    z.object({
      dataPoints: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of exported data point records with the requested fields'),
      totalCount: z.number().describe('Total number of data points returned')
    })
  )
  .handleInvocation(async ctx => {
    let config = { token: ctx.auth.token, userId: ctx.auth.userId };
    let params = {
      hostname: ctx.config.hostname,
      start: ctx.input.start,
      end: ctx.input.end,
      fields: [...ctx.input.fields, ...(ctx.input.additionalFields ?? [])],
      type: ctx.input.type,
      timezone: ctx.input.timezone,
      robots: ctx.input.includeRobots
    };
    let dataPoints = await exportDataPoints(config, params);
    await ctx.addAttachment({
      type: 'url',
      ...getExportDownloadDetails(config, params),
      mimeType: 'application/json'
    });

    return {
      output: {
        dataPoints,
        totalCount: dataPoints.length
      },
      message: `Exported **${dataPoints.length}** raw data point(s) for **${ctx.config.hostname}** from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();
