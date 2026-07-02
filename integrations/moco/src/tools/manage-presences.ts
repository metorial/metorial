import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let presenceOutputSchema = z.object({
  presenceId: z.number().describe('Presence entry ID'),
  date: z.string().optional().describe('Presence date'),
  from: z.string().optional().describe('Clock-in time (HH:MM)'),
  to: z.string().optional().describe('Clock-out time (HH:MM)'),
  isHomeOffice: z.boolean().optional().describe('Whether this is a home office day'),
  user: z.any().optional().describe('User details'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapPresence = (p: any) => ({
  presenceId: p.id,
  date: p.date,
  from: p.from,
  to: p.to,
  isHomeOffice: p.is_home_office,
  user: p.user,
  createdAt: p.created_at,
  updatedAt: p.updated_at
});

export let listPresences = SlateTool.create(spec, {
  name: 'List Presences',
  key: 'list_presences',
  description: `Retrieve clock-in/clock-out presence entries. Filter by date range and user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      userId: z.number().optional().describe('Filter by user ID'),
      isHomeOffice: z.boolean().optional().describe('Filter by home office status')
    })
  )
  .output(
    z.object({
      presences: z.array(presenceOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.from) params.from = ctx.input.from;
    if (ctx.input.to) params.to = ctx.input.to;
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.isHomeOffice !== undefined) params.is_home_office = ctx.input.isHomeOffice;

    let data = await client.listPresences(params);
    let presences = (data as any[]).map(mapPresence);

    return {
      output: { presences },
      message: `Found **${presences.length}** presence entries.`
    };
  })
  .build();

export let clockInOut = SlateTool.create(spec, {
  name: 'Clock In/Out',
  key: 'clock_in_out',
  description: `Toggle clock-in or clock-out for the authenticated user. If clocked out, this will clock you in; if clocked in, this will clock you out.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      isHomeOffice: z.boolean().optional().describe('Whether this is a home office session')
    })
  )
  .output(presenceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {};
    if (ctx.input.isHomeOffice !== undefined) data.is_home_office = ctx.input.isHomeOffice;

    let p = await client.touchPresence(data);

    return {
      output: mapPresence(p),
      message: `Presence toggled for ${p.date}.`
    };
  })
  .build();

export let createPresence = SlateTool.create(spec, {
  name: 'Create Presence',
  key: 'create_presence',
  description: `Create a presence entry with specific date and time. Useful for manual time corrections.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      date: z.string().describe('Presence date (YYYY-MM-DD)'),
      from: z.string().describe('Clock-in time (HH:MM, e.g. "09:00")'),
      to: z.string().optional().describe('Clock-out time (HH:MM, e.g. "17:30")'),
      isHomeOffice: z.boolean().optional().describe('Whether this is a home office day')
    })
  )
  .output(presenceOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      date: ctx.input.date,
      from: ctx.input.from
    };

    if (ctx.input.to) data.to = ctx.input.to;
    if (ctx.input.isHomeOffice !== undefined) data.is_home_office = ctx.input.isHomeOffice;

    let p = await client.createPresence(data);

    return {
      output: mapPresence(p),
      message: `Created presence entry for ${p.date} from ${p.from}${p.to ? ` to ${p.to}` : ''}.`
    };
  })
  .build();
