import { SlateTool } from 'slates';
import { z } from 'zod';
import { exportDataPoints } from '../lib/export';
import { spec } from '../spec';

export let exportDataTool = SlateTool.create(spec, {
  name: 'Export Raw Data',
  key: 'export_raw_data',
  description: `Export raw, unsampled analytics data points from Simple Analytics. Data points include both page views and events. Define a date range and select the fields you need. Requires both API key and User-Id authentication.`,
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
          'Start date in YYYY-MM-DD format. For hourly export use YYYY-MM-DDTHH format.'
        ),
      end: z
        .string()
        .describe(
          'End date in YYYY-MM-DD format. For hourly export use YYYY-MM-DDTHH format (same day only).'
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
    let data = await exportDataPoints(
      { token: ctx.auth.token, userId: ctx.auth.userId },
      {
        hostname: ctx.config.hostname,
        start: ctx.input.start,
        end: ctx.input.end,
        fields: ctx.input.fields,
        type: ctx.input.type,
        timezone: ctx.input.timezone,
        robots: ctx.input.includeRobots
      }
    );

    let dataPoints: Record<string, unknown>[] = [];
    if (Array.isArray(data)) {
      dataPoints = data;
    } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
      dataPoints = data.data;
    }

    return {
      output: {
        dataPoints,
        totalCount: dataPoints.length
      },
      message: `Exported **${dataPoints.length}** raw data point(s) for **${ctx.config.hostname}** from ${ctx.input.start} to ${ctx.input.end}.`
    };
  })
  .build();
