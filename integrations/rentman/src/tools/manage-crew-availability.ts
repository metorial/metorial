import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCrewAvailability = SlateTool.create(spec, {
  name: 'Create Crew Availability',
  key: 'create_crew_availability',
  description: `Record availability or unavailability for a crew member in Rentman. Use this to block off time or mark crew as available for scheduling.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      crewId: z.number().describe('ID of the crew member'),
      from: z.string().describe('Availability start date/time (ISO 8601)'),
      to: z.string().describe('Availability end date/time (ISO 8601)'),
      status: z
        .string()
        .optional()
        .describe('Availability status (e.g. available, unavailable)'),
      memo: z.string().optional().describe('Notes about this availability entry')
    })
  )
  .output(
    z.object({
      availabilityId: z.number().describe('ID of the created availability entry'),
      crewId: z.number(),
      from: z.string().optional(),
      to: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      from: ctx.input.from,
      to: ctx.input.to
    };

    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.memo) body.memo = ctx.input.memo;

    let result = await client.createNested('crew', ctx.input.crewId, 'crewavailability', body);
    let a = result.data as any;

    return {
      output: {
        availabilityId: a.id,
        crewId: ctx.input.crewId,
        from: a.from,
        to: a.to,
        createdAt: a.created
      },
      message: `Created availability entry (ID: ${a.id}) for crew member **${ctx.input.crewId}**.`
    };
  })
  .build();

export let listCrewAvailability = SlateTool.create(spec, {
  name: 'List Crew Availability',
  key: 'list_crew_availability',
  description: `Retrieve availability entries for a crew member. See when crew members are available or unavailable.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      crewId: z.number().describe('ID of the crew member'),
      limit: z.number().optional().default(25).describe('Maximum number of results'),
      offset: z.number().optional().default(0).describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      availability: z.array(
        z.object({
          availabilityId: z.number(),
          from: z.string().optional(),
          to: z.string().optional(),
          status: z.string().optional(),
          memo: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      itemCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listNested('crew', ctx.input.crewId, 'crewavailability', {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let availability = result.data.map((a: any) => ({
      availabilityId: a.id,
      from: a.from,
      to: a.to,
      status: a.status,
      memo: a.memo,
      createdAt: a.created
    }));

    return {
      output: {
        availability,
        itemCount: result.itemCount
      },
      message: `Found **${result.itemCount}** availability entries for crew member **${ctx.input.crewId}**.`
    };
  })
  .build();
