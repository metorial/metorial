import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAttendanceMeeting = SlateTool.create(spec, {
  name: 'Create Attendance Meeting',
  key: 'create_attendance_meeting',
  description: `Create an attendance meeting (class session) for a course. Meetings created via the API can only have their attendance modified via the API.`,
  constraints: [
    'Attendance records for API-created meetings can only be modified through the API, not the Blackboard GUI.'
  ],
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      title: z.string().optional().describe('Meeting title'),
      start: z.string().optional().describe('Meeting start time (ISO 8601)'),
      end: z.string().optional().describe('Meeting end time (ISO 8601)')
    })
  )
  .output(
    z.object({
      meetingId: z.string().describe('Meeting ID'),
      title: z.string().optional().describe('Meeting title'),
      start: z.string().optional().describe('Start time'),
      end: z.string().optional().describe('End time'),
      created: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let meeting = await client.createAttendanceMeeting(ctx.input.courseId, {
      title: ctx.input.title,
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: {
        meetingId: meeting.id,
        title: meeting.title,
        start: meeting.start,
        end: meeting.end,
        created: meeting.created
      },
      message: `Created attendance meeting${meeting.title ? ` **${meeting.title}**` : ''} for course **${ctx.input.courseId}**.`
    };
  })
  .build();

export let listAttendanceMeetings = SlateTool.create(spec, {
  name: 'List Attendance Meetings',
  key: 'list_attendance_meetings',
  description: `List attendance meetings (class sessions) for a course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      meetings: z.array(
        z.object({
          meetingId: z.string(),
          title: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          created: z.string().optional()
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listAttendanceMeetings(ctx.input.courseId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let meetings = (result.results || []).map(m => ({
      meetingId: m.id,
      title: m.title,
      start: m.start,
      end: m.end,
      created: m.created
    }));

    return {
      output: { meetings, hasMore: !!result.paging?.nextPage },
      message: `Found **${meetings.length}** attendance meeting(s).`
    };
  })
  .build();

export let recordAttendance = SlateTool.create(spec, {
  name: 'Record Attendance',
  key: 'record_attendance',
  description: `Record or update a student's attendance for a specific meeting. Set the status to present, late, absent, or excused.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      meetingId: z.string().describe('Meeting ID'),
      userId: z.string().describe('User identifier'),
      status: z.enum(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED']).describe('Attendance status')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      meetingId: z.string().optional().describe('Meeting ID'),
      status: z.string().describe('Updated attendance status'),
      modified: z.string().optional().describe('Last modified timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let record = await client.updateAttendanceRecord(
      ctx.input.courseId,
      ctx.input.meetingId,
      ctx.input.userId,
      { status: ctx.input.status }
    );

    return {
      output: {
        userId: record.userId,
        meetingId: record.meetingId,
        status: record.status,
        modified: record.modified
      },
      message: `Recorded **${ctx.input.status}** for user **${ctx.input.userId}** in meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();

export let listAttendanceRecords = SlateTool.create(spec, {
  name: 'List Attendance Records',
  key: 'list_attendance_records',
  description: `List attendance records for a specific meeting, showing all student statuses.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      courseId: z.string().describe('Course identifier'),
      meetingId: z.string().describe('Meeting ID'),
      offset: z.number().optional().describe('Number of items to skip'),
      limit: z.number().optional().describe('Maximum results to return')
    })
  )
  .output(
    z.object({
      records: z.array(
        z.object({
          userId: z.string(),
          status: z.string(),
          modified: z.string().optional()
        })
      ),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let result = await client.listAttendanceRecords(ctx.input.courseId, ctx.input.meetingId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let records = (result.results || []).map(r => ({
      userId: r.userId,
      status: r.status,
      modified: r.modified
    }));

    return {
      output: { records, hasMore: !!result.paging?.nextPage },
      message: `Found **${records.length}** attendance record(s).`
    };
  })
  .build();
