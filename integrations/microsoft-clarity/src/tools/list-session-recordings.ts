import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClarityClient } from '../lib/client';
import { spec } from '../spec';

let sessionRecordingSchema = z
  .record(z.string(), z.any())
  .describe('Session recording data from Clarity');

export let listSessionRecordings = SlateTool.create(spec, {
  name: 'List Session Recordings',
  key: 'list_session_recordings',
  description: `Lists session recordings from Microsoft Clarity for a given date range. Supports filtering by URLs, device types, browsers, operating systems, countries, and cities.

Returns a sample of session recordings matching the specified criteria, useful for reviewing user behavior on specific pages or segments.`,
  instructions: [
    'Dates must be in UTC ISO 8601 format (e.g. "2025-01-15T00:00:00Z").',
    'Use filters to narrow results to specific user segments or pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z
        .string()
        .describe('Start date in UTC ISO 8601 format (e.g. "2025-01-15T00:00:00Z")'),
      endDate: z
        .string()
        .describe('End date in UTC ISO 8601 format (e.g. "2025-01-16T00:00:00Z")'),
      urls: z
        .array(z.string())
        .optional()
        .describe('Filter to recordings that visited these URLs'),
      deviceTypes: z
        .array(z.string())
        .optional()
        .describe('Filter by device types (e.g. "Desktop", "Mobile", "Tablet")'),
      browsers: z
        .array(z.string())
        .optional()
        .describe('Filter by browser names (e.g. "Chrome", "Firefox", "Safari")'),
      operatingSystems: z
        .array(z.string())
        .optional()
        .describe('Filter by operating systems (e.g. "Windows", "macOS", "Android")'),
      countries: z.array(z.string()).optional().describe('Filter by country names'),
      cities: z.array(z.string()).optional().describe('Filter by city names'),
      sortBy: z.string().optional().describe('Sort criteria for recordings'),
      count: z.number().optional().describe('Maximum number of recordings to return')
    })
  )
  .output(
    z.object({
      recordings: z
        .array(sessionRecordingSchema)
        .describe('Array of session recording entries'),
      totalCount: z.number().describe('Number of recordings returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClarityClient(ctx.auth.token);

    ctx.progress('Fetching session recordings...');

    let recordings = await client.listSessionRecordings({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      sortBy: ctx.input.sortBy,
      count: ctx.input.count,
      filters: {
        urls: ctx.input.urls,
        deviceTypes: ctx.input.deviceTypes,
        browsers: ctx.input.browsers,
        operatingSystems: ctx.input.operatingSystems,
        countries: ctx.input.countries,
        cities: ctx.input.cities
      }
    });

    let recordingsList = Array.isArray(recordings) ? recordings : [];

    return {
      output: {
        recordings: recordingsList,
        totalCount: recordingsList.length
      },
      message: `Retrieved **${recordingsList.length}** session recording(s) from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
    };
  })
  .build();
