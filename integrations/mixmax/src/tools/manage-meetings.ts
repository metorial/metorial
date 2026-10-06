import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let meetingTypeSchema = z.object({
  meetingTypeId: z.string().describe('Meeting type ID'),
  name: z.string().optional().describe('Meeting type name'),
  userId: z.string().optional().describe('Owner user ID'),
  durationMin: z.number().optional().describe('Duration in minutes'),
  buffer: z.number().optional().describe('Buffer time in minutes between meetings'),
  createdAt: z.string().optional().describe('When the meeting type was created'),
  updatedAt: z.string().optional().describe('When the meeting type was last updated'),
  defaults: z
    .object({
      title: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional()
    })
    .optional()
    .describe('Default meeting details')
});

let meetingInviteSchema = z.object({
  inviteId: z.string().describe('Meeting invite ID'),
  title: z.string().optional().describe('Meeting title'),
  organizerEmail: z.string().optional().describe('Organizer email'),
  organizerName: z.string().optional().describe('Organizer name'),
  guestEmail: z.string().optional().describe('Guest email'),
  guestName: z.string().optional().describe('Guest name'),
  timezone: z.string().optional().describe('Meeting timezone'),
  createdAt: z.string().optional().describe('When the invite was created')
});

export let listMeetingTypes = SlateTool.create(spec, {
  name: 'List Meeting Types',
  key: 'list_meeting_types',
  description: `List a page of meeting types configured for your account. Meeting types define scheduling rules like duration, availability windows, and default meeting details. Use nextCursor while hasNext is true to read more results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum results in one page, from 1 to 300.'),
      cursor: z.string().optional().describe('Cursor returned as nextCursor on a prior page.')
    })
  )
  .output(
    z.object({
      meetingTypes: z.array(meetingTypeSchema).describe('List of meeting types'),
      nextCursor: z.string().optional().describe('Provider cursor for the next page'),
      hasNext: z.boolean().optional().describe('Whether another page currently exists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listMeetingTypes({
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });
    let results = data.results;
    let meetingTypes = results.map(mt => ({
      meetingTypeId: mt._id,
      name: mt.name,
      userId: mt.userId,
      durationMin: mt.durationMin,
      buffer: mt.buffer,
      createdAt: mt.createdAt,
      updatedAt: mt.updatedAt,
      defaults: mt.defaults
    }));

    return {
      output: { meetingTypes, nextCursor: data.next, hasNext: data.hasNext },
      message: `Found ${meetingTypes.length} meeting type(s).`
    };
  })
  .build();

export let manageMeetingType = SlateTool.create(spec, {
  name: 'Manage Meeting Type',
  key: 'manage_meeting_type',
  description: `Create, update, or delete a meeting type. Scheduling settings affect appointment links; the last remaining meeting type cannot be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      meetingTypeId: z
        .string()
        .optional()
        .describe('Meeting type ID (required for update/delete)'),
      name: z.string().optional().describe('Meeting type name'),
      durationMin: z.number().optional().describe('Duration in minutes'),
      buffer: z.number().optional().describe('Buffer time in minutes (0-60)'),
      defaults: z
        .object({
          title: z.string().optional(),
          location: z.string().optional(),
          description: z.string().optional()
        })
        .optional()
        .describe('Default meeting details')
    })
  )
  .output(
    z.object({
      meetingTypeId: z.string().optional().describe('Meeting type ID'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let data: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.durationMin !== undefined) data.durationMin = ctx.input.durationMin;
      if (ctx.input.buffer !== undefined) data.buffer = ctx.input.buffer;
      if (ctx.input.defaults) data.defaults = ctx.input.defaults;

      let result = await client.createMeetingType(data);
      return {
        output: { meetingTypeId: result._id, success: true },
        message: `Meeting type "${ctx.input.name}" created.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.meetingTypeId)
        throw createApiServiceError('meetingTypeId is required for update');
      let updates: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updates.name = ctx.input.name;
      if (ctx.input.durationMin !== undefined) updates.durationMin = ctx.input.durationMin;
      if (ctx.input.buffer !== undefined) updates.buffer = ctx.input.buffer;
      if (ctx.input.defaults) updates.defaults = ctx.input.defaults;

      await client.updateMeetingType(ctx.input.meetingTypeId, updates);
      return {
        output: { meetingTypeId: ctx.input.meetingTypeId, success: true },
        message: `Meeting type ${ctx.input.meetingTypeId} updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.meetingTypeId)
        throw createApiServiceError('meetingTypeId is required for delete');
      await client.deleteMeetingType(ctx.input.meetingTypeId);
      return {
        output: { meetingTypeId: ctx.input.meetingTypeId, success: true },
        message: `Meeting type ${ctx.input.meetingTypeId} deleted.`
      };
    }

    throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();

export let listMeetingInvites = SlateTool.create(spec, {
  name: 'List Meeting Invites',
  key: 'list_meeting_invites',
  description: `List meeting invitations that have been created through Mixmax scheduling. Returns invite details including organizer and guest information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      invites: z.array(meetingInviteSchema).describe('List of meeting invites'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listMeetingInvites({
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results;
    let invites = results.map(i => ({
      inviteId: i._id,
      title: i.title,
      organizerEmail: i.organizer?.email,
      organizerName: i.organizer?.name,
      guestEmail: i.guest?.email,
      guestName: i.guest?.name,
      timezone: i.timezone,
      createdAt: i.createdAt
    }));

    return {
      output: {
        invites,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${invites.length} meeting invite(s).`
    };
  })
  .build();
