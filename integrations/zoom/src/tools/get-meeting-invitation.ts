import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getMeetingInvitation = SlateTool.create(spec, {
  name: 'Get Meeting Invitation',
  key: 'get_meeting_invitation',
  description:
    'Retrieve the formatted Zoom meeting invitation text and SIP dial-in links for a meeting.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.union([z.string(), z.number()]).describe('The meeting ID')
    })
  )
  .output(
    z.object({
      invitation: z.string().optional().describe('Formatted Zoom meeting invitation text'),
      sipLinks: z.array(z.string()).optional().describe('SIP dial-in links for the meeting')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.getMeetingInvitation(ctx.input.meetingId);

    return {
      output: {
        invitation: result.invitation,
        sipLinks: result.sip_links
      },
      message: `Retrieved invitation for meeting **${ctx.input.meetingId}**.`
    };
  })
  .build();
