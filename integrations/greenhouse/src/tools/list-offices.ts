import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapOffice } from '../lib/mappers';
import { spec } from '../spec';

export let listOfficesTool = SlateTool.create(spec, {
  name: 'List Offices',
  key: 'list_offices',
  description: `List all offices in Greenhouse. Returns office names, hierarchy (parent/child relationships), locations, and external IDs.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)')
    })
  )
  .output(
    z.object({
      offices: z.array(
        z.object({
          officeId: z.string(),
          name: z.string(),
          parentOfficeId: z.string().nullable(),
          childOfficeIds: z.array(z.string()),
          location: z.object({ name: z.string() }).nullable(),
          externalId: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listOffices({
      page: ctx.input.page,
      perPage
    });

    let offices = results.map(mapOffice);

    return {
      output: {
        offices,
        hasMore: results.length >= perPage
      },
      message: `Found ${offices.length} office(s).`
    };
  })
  .build();
