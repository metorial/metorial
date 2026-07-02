import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let speakerSchema = z.object({
  index: z.number().optional(),
  name: z.string().nullable().optional(),
  emailAddress: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  userUuid: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  longestMonologue: z.number().nullable().optional(),
  isUser: z.boolean().optional()
});

let chapterSchema = z.object({
  chapterUuid: z.string().optional(),
  index: z.number().optional(),
  title: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  startTime: z.number().nullable().optional()
});

let topicSchema = z.object({
  topicUuid: z.string().optional(),
  topicName: z.string().nullable().optional(),
  keyphrase: z.string().nullable().optional(),
  startTime: z.number().nullable().optional(),
  endTime: z.number().nullable().optional()
});

let promptCompletionSchema = z.object({
  promptUuid: z.string().optional(),
  category: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  completions: z.array(z.any()).optional()
});

export let callProcessed = SlateTrigger.create(spec, {
  name: 'Call Processed',
  key: 'call_processed',
  description:
    'Triggers when a call or meeting has been fully processed by Leexi, meaning the recording has been imported and the transcript, summaries, and other AI-generated content are available.'
})
  .input(
    z.object({
      event: z.string().describe('Event type'),
      callUuid: z.string().describe('UUID of the processed call'),
      callData: z.any().describe('Full call data from the webhook')
    })
  )
  .output(
    z.object({
      callUuid: z.string().describe('UUID of the processed call'),
      title: z.string().nullable().optional().describe('Title of the call'),
      description: z.string().nullable().optional().describe('Description of the call'),
      direction: z
        .string()
        .nullable()
        .optional()
        .describe('Call direction: inbound or outbound'),
      duration: z.number().nullable().optional().describe('Duration in seconds'),
      source: z.string().nullable().optional().describe('Integration source'),
      sourceId: z.string().nullable().optional().describe('External source ID'),
      isVideo: z.boolean().nullable().optional().describe('Whether this is a video call'),
      locale: z.string().nullable().optional().describe('Language locale code'),
      owner: z
        .object({
          userUuid: z.string().optional(),
          name: z.string().optional(),
          email: z.string().optional()
        })
        .nullable()
        .optional()
        .describe('Call owner'),
      participatingUsers: z
        .array(
          z.object({
            userUuid: z.string().optional(),
            name: z.string().optional(),
            email: z.string().optional()
          })
        )
        .optional()
        .describe('Participating users'),
      customerEmailAddresses: z
        .array(z.string())
        .optional()
        .describe('Customer email addresses'),
      customerPhoneNumbers: z.array(z.string()).optional().describe('Customer phone numbers'),
      speakers: z.array(speakerSchema).optional().describe('Call speakers with metrics'),
      chapters: z.array(chapterSchema).optional().describe('Auto-generated chapters'),
      callTopics: z.array(topicSchema).optional().describe('Identified call topics'),
      prompts: z.array(promptCompletionSchema).optional().describe('AI-generated completions'),
      simpleTranscript: z.string().nullable().optional().describe('Simple text transcript'),
      recordingUrl: z.string().nullable().optional().describe('URL to the call recording'),
      transcriptUrl: z.string().nullable().optional().describe('URL to the transcript'),
      leexiUrl: z.string().nullable().optional().describe('URL to the call in Leexi'),
      performedAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO 8601 timestamp when the call was performed'),
      createdAt: z.string().nullable().optional().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('ISO 8601 last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let callData = body.data || {};
      let callUuid = callData.uuid || '';

      return {
        inputs: [
          {
            event: body.event || 'call.processed',
            callUuid,
            callData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let c = ctx.input.callData || {};

      return {
        type: 'call.processed',
        id: ctx.input.callUuid,
        output: {
          callUuid: c.uuid || ctx.input.callUuid,
          title: c.title,
          description: c.description,
          direction: c.direction,
          duration: c.duration,
          source: c.source,
          sourceId: c.source_id,
          isVideo: c.is_video,
          locale: c.locale,
          owner: c.owner
            ? {
                userUuid: c.owner.uuid,
                name: c.owner.name,
                email: c.owner.email
              }
            : null,
          participatingUsers: (c.participating_users || []).map((u: any) => ({
            userUuid: u.uuid,
            name: u.name,
            email: u.email
          })),
          customerEmailAddresses: c.customer_email_addresses,
          customerPhoneNumbers: c.customer_phone_numbers,
          speakers: (c.speakers || []).map((s: any) => ({
            index: s.index,
            name: s.name,
            emailAddress: s.email_address,
            phoneNumber: s.phone_number,
            userUuid: s.uuid,
            duration: s.duration,
            longestMonologue: s.longest_monologue,
            isUser: s.is_user
          })),
          chapters: (c.chapters || []).map((ch: any) => ({
            chapterUuid: ch.uuid,
            index: ch.index,
            title: ch.title,
            text: ch.text,
            startTime: ch.start_time
          })),
          callTopics: (c.call_topics || []).map((t: any) => ({
            topicUuid: t.uuid,
            topicName: t.topic_name,
            keyphrase: t.keyphrase,
            startTime: t.start_time,
            endTime: t.end_time
          })),
          prompts: (c.prompts || []).map((p: any) => ({
            promptUuid: p.uuid,
            category: p.category,
            title: p.title,
            completions: p.completions
          })),
          simpleTranscript: c.simple_transcript,
          recordingUrl: c.recording_url,
          transcriptUrl: c.transcript_url,
          leexiUrl: c.leexi_url,
          performedAt: c.performed_at,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }
      };
    }
  })
  .build();
