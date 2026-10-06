import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapNumber } from '../lib/contracts';
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
          open: z.boolean().optional().describe('Whether the number is currently open/active'),
          liveRecordingActivated: z
            .boolean()
            .optional()
            .describe('Whether live recording is enabled'),
          createdAt: z.string().optional().describe('Creation date as ISO string')
        })
      ),
      perPage: z.number().optional(),
      nextPageLink: z.string().nullable().optional(),
      previousPageLink: z.string().nullable().optional(),
      collectionLimit: z.number().optional(),
      historyWindowMonths: z.number().optional(),
      totalCount: z.number().describe('Total number of phone numbers'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listNumbers(ctx.input);
    return {
      output: {
        numbers: result.items.map(mapNumber),
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage,
        nextPageLink: result.meta.nextPageLink
      },
      message: `Retrieved ${result.items.length} numbers from native page ${result.meta.currentPage}.`
    };
  })
  .build();
