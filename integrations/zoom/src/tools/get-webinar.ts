import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getWebinar = SlateTool.create(spec, {
  name: 'Get Webinar',
  key: 'get_webinar',
  description: 'Retrieve detailed information about a specific Zoom webinar by its ID.',
  constraints: ['Requires a paid Zoom Webinar add-on'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      webinarId: z.union([z.string(), z.number()]).describe('The webinar ID'),
      occurrenceId: z.string().optional().describe('Specific webinar occurrence ID'),
      showPreviousOccurrences: z
        .boolean()
        .optional()
        .describe('Include previous occurrences for recurring webinars')
    })
  )
  .output(
    z.object({
      webinarId: z.number().describe('Webinar ID'),
      uuid: z.string().optional().describe('Webinar UUID'),
      topic: z.string().describe('Webinar topic'),
      type: z.number().describe('Webinar type'),
      startTime: z.string().optional().describe('Webinar start time'),
      duration: z.number().optional().describe('Duration in minutes'),
      timezone: z.string().optional().describe('Timezone'),
      agenda: z.string().optional().describe('Webinar agenda'),
      joinUrl: z.string().optional().describe('URL for attendees to join'),
      startUrl: z.string().optional().describe('URL for the host to start'),
      registrationUrl: z.string().optional().describe('Registration URL'),
      password: z.string().optional().describe('Webinar password'),
      hostId: z.string().optional().describe('Host user ID'),
      hostEmail: z.string().optional().describe('Host email'),
      createdAt: z.string().optional().describe('Creation time'),
      settings: z.any().optional().describe('Full webinar settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let webinar = await client.getWebinar(ctx.input.webinarId, {
      occurrenceId: ctx.input.occurrenceId,
      showPreviousOccurrences: ctx.input.showPreviousOccurrences
    });

    return {
      output: {
        webinarId: webinar.id,
        uuid: webinar.uuid,
        topic: webinar.topic,
        type: webinar.type,
        startTime: webinar.start_time,
        duration: webinar.duration,
        timezone: webinar.timezone,
        agenda: webinar.agenda,
        joinUrl: webinar.join_url,
        startUrl: webinar.start_url,
        registrationUrl: webinar.registration_url,
        password: webinar.password,
        hostId: webinar.host_id,
        hostEmail: webinar.host_email,
        createdAt: webinar.created_at,
        settings: webinar.settings
      },
      message: `Retrieved webinar **${webinar.topic}** (ID: ${webinar.id}).`
    };
  })
  .build();
