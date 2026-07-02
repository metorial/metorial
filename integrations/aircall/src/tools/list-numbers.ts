import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNumbers = SlateTool.create(spec, {
  name: 'List Numbers',
  key: 'list_numbers',
  description: `List all phone numbers associated with the Aircall account. Returns number details including country, timezone, open/closed status, and live recording settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 50, default: 20)')
    })
  )
  .output(
    z.object({
      numbers: z.array(
        z.object({
          numberId: z.number().describe('Unique number identifier'),
          name: z.string().nullable().describe('Display name of the number'),
          digits: z.string().describe('Phone number in E.164 format'),
          country: z.string().nullable().describe('Country code'),
          timeZone: z.string().nullable().describe('Timezone'),
          open: z.boolean().describe('Whether the number is currently open/active'),
          liveRecordingActivated: z.boolean().describe('Whether live recording is enabled'),
          createdAt: z.string().describe('Creation date as ISO string')
        })
      ),
      totalCount: z.number().describe('Total number of phone numbers'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.listNumbers({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let numbers = result.items.map((num: any) => ({
      numberId: num.id,
      name: num.name ?? null,
      digits: num.digits,
      country: num.country ?? null,
      timeZone: num.time_zone ?? null,
      open: num.open ?? false,
      liveRecordingActivated: num.live_recording_activated ?? false,
      createdAt: num.created_at
        ? new Date(num.created_at * 1000).toISOString()
        : new Date().toISOString()
    }));

    return {
      output: {
        numbers,
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage
      },
      message: `Found **${result.meta.total}** phone numbers (showing page ${result.meta.currentPage}, ${numbers.length} results).`
    };
  })
  .build();
