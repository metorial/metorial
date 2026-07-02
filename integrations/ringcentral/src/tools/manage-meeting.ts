import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let meetingOutputSchema = z.object({
  meetingId: z.string().optional().describe('Meeting ID'),
  topic: z.string().optional().describe('Meeting topic'),
  meetingType: z.string().optional().describe('Meeting type (Instant, Scheduled, Recurring)'),
  startTime: z.string().optional().describe('Scheduled start time in ISO 8601 format'),
  joinUrl: z.string().optional().describe('URL to join the meeting'),
  meetings: z
    .array(
      z.object({
        meetingId: z.string().optional().describe('Meeting ID'),
        topic: z.string().optional().describe('Meeting topic'),
        meetingType: z.string().optional().describe('Meeting type'),
        startTime: z.string().optional().describe('Scheduled start time'),
        joinUrl: z.string().optional().describe('URL to join the meeting')
      })
    )
    .optional()
    .describe('List of meetings (only for list action)')
});

export let manageMeeting = SlateTool.create(spec, {
  name: 'Manage Meeting',
  key: 'manage_meeting',
  description: `Create, retrieve, update, delete, or list RingCentral video meetings. Combine multiple meeting management operations in a single tool — schedule a new meeting, update its settings, fetch details, or clean up old meetings.`,
  instructions: [
    'To **create** a meeting, set action to "create" and optionally provide topic, meetingType, startTime, durationInMinutes, password, and allowJoinBeforeHost.',
    'To **get** a meeting, set action to "get" and provide the meetingId.',
    'To **update** a meeting, set action to "update" and provide the meetingId plus any fields to change.',
    'To **delete** a meeting, set action to "delete" and provide the meetingId.',
    'To **list** all meetings, set action to "list".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('The meeting management action to perform'),
      meetingId: z
        .string()
        .optional()
        .describe('Meeting ID (required for get, update, delete)'),
      topic: z.string().optional().describe('Meeting topic or title'),
      meetingType: z
        .enum(['Instant', 'Scheduled', 'Recurring'])
        .optional()
        .describe('Type of meeting to create or update'),
      startTime: z
        .string()
        .optional()
        .describe('Scheduled start time in ISO 8601 format (for Scheduled meetings)'),
      durationInMinutes: z.number().optional().describe('Duration of the meeting in minutes'),
      password: z.string().optional().describe('Meeting password'),
      allowJoinBeforeHost: z
        .boolean()
        .optional()
        .describe('Whether participants can join before the host')
    })
  )
  .output(meetingOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let {
      action,
      meetingId,
      topic,
      meetingType,
      startTime,
      durationInMinutes,
      password,
      allowJoinBeforeHost
    } = ctx.input;

    if (action === 'create') {
      let params: any = {};
      if (topic) params.topic = topic;
      if (meetingType) params.meetingType = meetingType;
      if (startTime || durationInMinutes) {
        params.schedule = {};
        if (startTime) params.schedule.startTime = startTime;
        if (durationInMinutes) params.schedule.durationInMinutes = durationInMinutes;
      }
      if (password) params.password = password;
      if (allowJoinBeforeHost !== undefined) params.allowJoinBeforeHost = allowJoinBeforeHost;

      let meeting = await client.createMeeting(params);

      return {
        output: {
          meetingId: String(meeting.id),
          topic: meeting.topic,
          meetingType: meeting.meetingType,
          startTime: meeting.schedule?.startTime,
          joinUrl: meeting.links?.joinUri
        },
        message: `Created meeting **${meeting.topic || 'Untitled'}** (\`${meeting.id}\`).`
      };
    }

    if (action === 'list') {
      let result = await client.listMeetings();
      let records = result.records || result || [];

      let meetings = records.map((m: any) => ({
        meetingId: String(m.id),
        topic: m.topic,
        meetingType: m.meetingType,
        startTime: m.schedule?.startTime,
        joinUrl: m.links?.joinUri
      }));

      return {
        output: {
          meetings
        },
        message: `Found **${meetings.length}** meeting(s).`
      };
    }

    if (!meetingId) throw new Error('meetingId is required for this action');

    if (action === 'get') {
      let meeting = await client.getMeeting(meetingId);

      return {
        output: {
          meetingId: String(meeting.id),
          topic: meeting.topic,
          meetingType: meeting.meetingType,
          startTime: meeting.schedule?.startTime,
          joinUrl: meeting.links?.joinUri
        },
        message: `Retrieved meeting **${meeting.topic || meetingId}** (\`${meeting.id}\`).`
      };
    }

    if (action === 'delete') {
      await client.deleteMeeting(meetingId);

      return {
        output: {
          meetingId
        },
        message: `Deleted meeting \`${meetingId}\`.`
      };
    }

    // action === 'update'
    let updateParams: any = {};
    if (topic) updateParams.topic = topic;
    if (meetingType) updateParams.meetingType = meetingType;
    if (startTime || durationInMinutes) {
      updateParams.schedule = {};
      if (startTime) updateParams.schedule.startTime = startTime;
      if (durationInMinutes) updateParams.schedule.durationInMinutes = durationInMinutes;
    }
    if (password) updateParams.password = password;
    if (allowJoinBeforeHost !== undefined)
      updateParams.allowJoinBeforeHost = allowJoinBeforeHost;

    let updated = await client.updateMeeting(meetingId, updateParams);

    return {
      output: {
        meetingId: String(updated.id),
        topic: updated.topic,
        meetingType: updated.meetingType,
        startTime: updated.schedule?.startTime,
        joinUrl: updated.links?.joinUri
      },
      message: `Updated meeting **${updated.topic || meetingId}** (\`${updated.id}\`).`
    };
  })
  .build();
