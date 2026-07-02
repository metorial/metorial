import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let createWebinar = SlateTool.create(spec, {
  name: 'Create Webinar',
  key: 'create_webinar',
  description: `Schedule a new Zoom webinar. Requires the Zoom Webinar add-on. Supports configuring registration, panelists, Q&A, and recording settings.`,
  constraints: ['Requires a paid Zoom Webinar add-on'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      topic: z.string().describe('Webinar topic/title'),
      type: z
        .number()
        .default(5)
        .describe('5=webinar, 6=recurring no fixed time, 9=recurring with fixed time'),
      startTime: z
        .string()
        .optional()
        .describe('Webinar start time in UTC (yyyy-MM-ddTHH:mm:ssZ)'),
      duration: z.number().optional().describe('Webinar duration in minutes'),
      timezone: z.string().optional().describe('Timezone (e.g., "America/New_York")'),
      password: z.string().optional().describe('Webinar password'),
      agenda: z.string().optional().describe('Webinar description/agenda'),
      settings: z
        .object({
          hostVideo: z.boolean().optional().describe('Start video when host joins'),
          panelistsVideo: z.boolean().optional().describe('Start video for panelists'),
          approvalType: z
            .number()
            .optional()
            .describe('0=auto, 1=manual, 2=no registration required'),
          registrationType: z
            .number()
            .optional()
            .describe(
              '1=register once, 2=register each time, 3=register once choose occurrences'
            ),
          audio: z
            .enum(['both', 'telephony', 'voip', 'thirdParty'])
            .optional()
            .describe('Audio options'),
          autoRecording: z
            .enum(['local', 'cloud', 'none'])
            .optional()
            .describe('Automatic recording'),
          practiceSession: z.boolean().optional().describe('Enable practice session'),
          questionAndAnswer: z
            .object({
              enable: z.boolean().describe('Enable Q&A'),
              allowAnonymousQuestions: z
                .boolean()
                .optional()
                .describe('Allow anonymous questions')
            })
            .optional()
            .describe('Q&A settings')
        })
        .optional()
        .describe('Webinar settings')
    })
  )
  .output(
    z.object({
      webinarId: z.number().describe('The webinar ID'),
      topic: z.string().describe('Webinar topic'),
      startTime: z.string().optional().describe('Webinar start time'),
      duration: z.number().optional().describe('Duration in minutes'),
      joinUrl: z.string().describe('URL for attendees to join'),
      startUrl: z.string().describe('URL for the host to start the webinar'),
      password: z.string().optional().describe('Webinar password'),
      hostEmail: z.string().optional().describe('Host email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);

    let webinarData: Record<string, any> = {
      topic: ctx.input.topic,
      type: ctx.input.type,
      start_time: ctx.input.startTime,
      duration: ctx.input.duration,
      timezone: ctx.input.timezone,
      password: ctx.input.password,
      agenda: ctx.input.agenda
    };

    if (ctx.input.settings) {
      let s = ctx.input.settings;
      webinarData.settings = {
        host_video: s.hostVideo,
        panelists_video: s.panelistsVideo,
        approval_type: s.approvalType,
        registration_type: s.registrationType,
        audio: s.audio,
        auto_recording: s.autoRecording,
        practice_session: s.practiceSession
      };
      if (s.questionAndAnswer) {
        webinarData.settings.question_and_answer = {
          enable: s.questionAndAnswer.enable,
          allow_anonymous_questions: s.questionAndAnswer.allowAnonymousQuestions
        };
      }
    }

    let webinar = await client.createWebinar(ctx.input.userId, webinarData);

    return {
      output: {
        webinarId: webinar.id,
        topic: webinar.topic,
        startTime: webinar.start_time,
        duration: webinar.duration,
        joinUrl: webinar.join_url,
        startUrl: webinar.start_url,
        password: webinar.password,
        hostEmail: webinar.host_email
      },
      message: `Webinar **${webinar.topic}** created successfully.\n- **Join URL:** ${webinar.join_url}\n- **Webinar ID:** ${webinar.id}`
    };
  })
  .build();
