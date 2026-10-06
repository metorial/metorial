import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapOffice, officeOutputSchema } from '../lib/mappers';
import { spec } from '../spec';
export const listOfficesTool = SlateTool.create(spec, {
  key: 'list_offices',
  name: 'List Offices',
  description:
    'List office names, locations, parent IDs and external IDs. Follow nextCursor to retrieve further results.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)')
    })
  )
  .output(
    z.object({
      offices: z.array(officeOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listOffices(ctx.input);
    return {
      output: {
        offices: page.items.map(mapOffice),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
