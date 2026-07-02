import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let listOfficesTool = SlateTool.create(spec, {
  name: 'List Offices',
  key: 'list_offices',
  description: `List all offices accessible with your API key. Returns office details including name, location, and associated departments and call centers.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      offices: z.array(
        z.object({
          officeId: z.string().describe('Office ID'),
          name: z.string().optional(),
          companyId: z.string().optional(),
          timezone: z.string().optional(),
          country: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let result = await client.listOffices({
      cursor: ctx.input.cursor
    });

    let offices = (result.items || []).map((o: any) => ({
      officeId: String(o.id),
      name: o.name,
      companyId: o.company_id ? String(o.company_id) : undefined,
      timezone: o.timezone,
      country: o.country
    }));

    return {
      output: {
        offices,
        nextCursor: result.cursor || undefined
      },
      message: `Found **${offices.length}** office(s)`
    };
  })
  .build();
