import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let launchMeetingAssistant = SlateTool.create(spec, {
  name: 'Launch Meeting Assistant',
  key: 'launch_meeting_assistant',
  description: `Launch or stop the Leexi AI meeting assistant for an active meeting. When launched, the bot joins the meeting to record and transcribe. Set "stopBot" to true to stop an active bot session.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      meetingEventUuid: z.string().describe('UUID of the meeting event'),
      stopBot: z
        .boolean()
        .optional()
        .describe(
          'Set to true to stop an ongoing bot session (default: false to launch the bot)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.launchMeetingAssistant(ctx.input.meetingEventUuid, ctx.input.stopBot);

    let action = ctx.input.stopBot ? 'stopped' : 'launched';
    return {
      output: {
        success: true
      },
      message: `Meeting assistant **${action}** for meeting event **${ctx.input.meetingEventUuid}**.`
    };
  })
  .build();
