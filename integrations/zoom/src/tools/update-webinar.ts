import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let updateWebinar = SlateTool.create(spec, {
  name: 'Update Webinar',
  key: 'update_webinar',
  description:
    "Update an existing Zoom webinar's topic, schedule, duration, agenda, or settings.",
  constraints: ['Requires a paid Zoom Webinar add-on'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webinarId: z.union([z.string(), z.number()]).describe('The webinar ID to update'),
      occurrenceId: z.string().optional().describe('Specific webinar occurrence ID'),
      topic: z.string().optional().describe('New webinar topic'),
      startTime: z.string().optional().describe('New start time in UTC'),
      duration: z.number().optional().describe('New duration in minutes'),
      timezone: z.string().optional().describe('New timezone'),
      password: z.string().optional().describe('New webinar password'),
      agenda: z.string().optional().describe('New webinar agenda'),
      settings: z
        .object({
          hostVideo: z.boolean().optional(),
          panelistsVideo: z.boolean().optional(),
          approvalType: z.number().optional(),
          audio: z.enum(['both', 'telephony', 'voip', 'thirdParty']).optional(),
          autoRecording: z.enum(['local', 'cloud', 'none']).optional(),
          practiceSession: z.boolean().optional()
        })
        .optional()
        .describe('Webinar settings to update')
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
        panelists_video: s.panelistsVideo,
        approval_type: s.approvalType,
        audio: s.audio,
        auto_recording: s.autoRecording,
        practice_session: s.practiceSession
      };
    }

    await client.updateWebinar(ctx.input.webinarId, updateData, {
      occurrenceId: ctx.input.occurrenceId
    });

    return {
      output: { success: true },
      message: `Webinar **${ctx.input.webinarId}** updated successfully.`
    };
  })
  .build();
