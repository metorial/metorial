import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let speakerSchema = z.object({
  index: z.number().optional().describe('Speaker index'),
  name: z.string().nullable().optional().describe('Speaker name'),
  emailAddress: z.string().nullable().optional().describe('Speaker email'),
  phoneNumber: z.string().nullable().optional().describe('Speaker phone number'),
  userUuid: z.string().nullable().optional().describe('Leexi user UUID if speaker is a user'),
  duration: z.number().nullable().optional().describe('Speaking duration in seconds'),
  longestMonologue: z
    .number()
    .nullable()
    .optional()
    .describe('Longest monologue duration in seconds'),
  isUser: z.boolean().optional().describe('Whether the speaker is a Leexi user')
});

let chapterSchema = z.object({
  chapterUuid: z.string().optional().describe('UUID of the chapter'),
  index: z.number().optional().describe('Chapter index'),
  title: z.string().nullable().optional().describe('Chapter title'),
  text: z.string().nullable().optional().describe('Chapter text content'),
  startTime: z.number().nullable().optional().describe('Start time in seconds')
});

let topicSchema = z.object({
  topicUuid: z.string().optional().describe('UUID of the topic'),
  topicName: z.string().nullable().optional().describe('Name of the topic'),
  keyphrase: z.string().nullable().optional().describe('Key phrase associated with the topic'),
  startTime: z.number().nullable().optional().describe('Start time in seconds'),
  endTime: z.number().nullable().optional().describe('End time in seconds')
});

let promptCompletionSchema = z.object({
  promptUuid: z.string().optional().describe('UUID of the prompt'),
  category: z
    .string()
    .nullable()
    .optional()
    .describe('Category of the prompt (e.g., summary, chaptering)'),
  title: z.string().nullable().optional().describe('Title of the prompt'),
  completions: z.array(z.any()).optional().describe('AI-generated completion results')
});

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Get detailed information about a specific call or meeting by UUID. Returns the full call record including transcript, speakers, chapters, topics, AI-generated summaries, and other prompt completions.`,
  instructions: [
    'Use "List Calls" first to find the call UUID.',
    'The simpleTranscript contains paragraph-level timestamps. The full transcript includes word-level timestamps.',
    'AI-generated content (summaries, chaptering, etc.) may not be immediately available after call creation.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callUuid: z.string().describe('UUID of the call to retrieve')
    })
  )
  .output(
    z.object({
      callUuid: z.string().describe('UUID of the call'),
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
      chapters: z.array(chapterSchema).optional().describe('Auto-generated call chapters'),
      callTopics: z.array(topicSchema).optional().describe('Identified call topics'),
      prompts: z
        .array(promptCompletionSchema)
        .optional()
        .describe('AI-generated prompt completions (summaries, etc.)'),
      simpleTranscript: z
        .string()
        .nullable()
        .optional()
        .describe('Simple text transcript with paragraph timestamps'),
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
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let response = await client.getCall(ctx.input.callUuid);
    let c = response.data || response;

    let output = {
      callUuid: c.uuid,
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
    };

    return {
      output,
      message: `Retrieved call **${c.title || c.uuid}** (${c.duration ? `${Math.round(c.duration / 60)} min` : 'unknown duration'}).`
    };
  })
  .build();
