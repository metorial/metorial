import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let apodItemSchema = z.object({
  date: z.string().describe('Date of the APOD entry (YYYY-MM-DD)'),
  title: z.string().describe('Title of the image or video'),
  explanation: z.string().describe('Scientific explanation of the image'),
  url: z.string().describe('URL of the image or video'),
  hdurl: z.string().optional().describe('High-definition URL of the image'),
  mediaType: z.string().describe('Type of media: image or video'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL for video entries'),
  copyright: z.string().optional().describe('Copyright holder of the image'),
  serviceVersion: z.string().optional().describe('API service version')
});

export let getApod = SlateTool.create(spec, {
  name: 'Get Astronomy Picture of the Day',
  key: 'get_apod',
  description: `Retrieve NASA's Astronomy Picture of the Day (APOD). Get a single day's featured astronomical image or video along with its title, explanation, and metadata. Supports fetching by specific date, date range, or random selection.`,
  constraints: [
    'Date range queries are limited to a maximum span of about 100 days.',
    'When using count, date/startDate/endDate cannot be specified.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      date: z
        .string()
        .optional()
        .describe('Specific date to retrieve (YYYY-MM-DD). Defaults to today.'),
      startDate: z
        .string()
        .optional()
        .describe(
          'Start of date range (YYYY-MM-DD). Use with endDate for a range of entries.'
        ),
      endDate: z
        .string()
        .optional()
        .describe('End of date range (YYYY-MM-DD). Defaults to today if startDate is set.'),
      count: z
        .number()
        .optional()
        .describe(
          'Number of random APOD entries to return. Cannot be used with date or date range.'
        ),
      thumbs: z.boolean().optional().describe('Return thumbnail URL for video entries.')
    })
  )
  .output(
    z.object({
      entries: z.array(apodItemSchema).describe('Array of APOD entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    let result = await client.getApod({
      date: ctx.input.date,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      count: ctx.input.count,
      thumbs: ctx.input.thumbs
    });

    let items = Array.isArray(result) ? result : [result];

    let entries = items.map((item: any) => ({
      date: item.date,
      title: item.title,
      explanation: item.explanation,
      url: item.url,
      hdurl: item.hdurl,
      mediaType: item.media_type,
      thumbnailUrl: item.thumbnail_url,
      copyright: item.copyright,
      serviceVersion: item.service_version
    }));

    let first = entries[0];
    let label =
      entries.length === 1 && first
        ? `**${first.title}** (${first.date})`
        : `${entries.length} APOD entries`;

    return {
      output: { entries },
      message: `Retrieved ${label}.`
    };
  })
  .build();
