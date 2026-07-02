import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let updateMeeting = SlateTool.create(spec, {
  name: 'Update Meeting',
  key: 'update_meeting',
  description: `Update an existing Zoom meeting's topic, schedule, duration, settings, or other properties. Only provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      meetingId: z.union([z.string(), z.number()]).describe('The meeting ID to update'),
      topic: z.string().optional().describe('New meeting topic'),
      startTime: z
        .string()
        .optional()
        .describe('New start time in UTC (yyyy-MM-ddTHH:mm:ssZ)'),
      duration: z.number().optional().describe('New duration in minutes'),
      timezone: z.string().optional().describe('New timezone'),
      password: z.string().optional().describe('New meeting password'),
      agenda: z.string().optional().describe('New meeting description/agenda'),
      settings: z
        .object({
          hostVideo: z.boolean().optional(),
          participantVideo: z.boolean().optional(),
          joinBeforeHost: z.boolean().optional(),
          muteUponEntry: z.boolean().optional(),
          waitingRoom: z.boolean().optional(),
          autoRecording: z.enum(['local', 'cloud', 'none']).optional(),
          alternativeHosts: z.string().optional()
        })
        .optional()
        .describe('Meeting settings to update')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    let updateData: Record<string, any> = {};
    if (ctx.input.topic !== undefined) updateData.topic = ctx.input.topic;
    if (ctx.input.startTime !== undefined) updateData.start_time = ctx.input.startTime;
    if (ctx.input.duration !== undefined) updateData.duration = ctx.input.duration;
    if (ctx.input.timezone !== undefined) updateData.timezone = ctx.input.timezone;
    if (ctx.input.password !== undefined) updateData.password = ctx.input.password;
    if (ctx.input.agenda !== undefined) updateData.agenda = ctx.input.agenda;

    if (ctx.input.settings) {
      let s = ctx.input.settings;
      updateData.settings = {
        host_video: s.hostVideo,
        participant_video: s.participantVideo,
        join_before_host: s.joinBeforeHost,
        mute_upon_entry: s.muteUponEntry,
        waiting_room: s.waitingRoom,
        auto_recording: s.autoRecording,
        alternative_hosts: s.alternativeHosts
      };
    }

    await client.updateMeeting(ctx.input.meetingId, updateData);

    return {
      output: { success: true },
      message: `Meeting **${ctx.input.meetingId}** updated successfully.`
    };
  })
  .build();
