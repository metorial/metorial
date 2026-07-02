import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let callParticipantSchema = z.object({
  userId: z.string().optional().describe('Gong user ID for an internal participant'),
  emailAddress: z.string().optional().describe('Participant email address'),
  phoneNumber: z.string().optional().describe('Participant phone number'),
  name: z.string().optional().describe('Participant name'),
  partyId: z
    .string()
    .optional()
    .describe('Participant identifier used by speakersTimeline, if provided'),
  mediaChannelId: z
    .number()
    .int()
    .min(0)
    .max(1)
    .optional()
    .describe('Stereo media channel for this participant: 0 for left, 1 for right'),
  context: z
    .array(z.any())
    .optional()
    .describe('External system references for this participant')
});

export let createCall = SlateTool.create(spec, {
  name: 'Create Call',
  key: 'create_call',
  description: `Create a Gong call record from an external recorder or telephony system. Provide call metadata and either a downloadMediaUrl or use the returned callId with add_call_media.`,
  instructions: [
    'parties must include the primaryUser participant.',
    'If downloadMediaUrl is omitted, call add_call_media with the returned callId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      clientUniqueId: z
        .string()
        .describe('Unique call ID in the external PBX or recording system'),
      title: z.string().optional().describe('Call title'),
      purpose: z.string().optional().describe('Call purpose'),
      scheduledStart: z
        .string()
        .optional()
        .describe('Scheduled start time in ISO 8601 format'),
      scheduledEnd: z.string().optional().describe('Scheduled end time in ISO 8601 format'),
      actualStart: z.string().describe('Actual call start time in ISO 8601 format'),
      duration: z.number().optional().describe('Actual call duration in seconds'),
      parties: z
        .array(callParticipantSchema)
        .min(1)
        .describe('Call participants. Include the primaryUser participant.'),
      direction: z
        .enum(['Inbound', 'Outbound', 'Conference', 'Unknown'])
        .describe('Call direction'),
      disposition: z.string().optional().describe('Call disposition'),
      context: z.array(z.any()).optional().describe('External system references for the call'),
      customData: z.string().optional().describe('Optional troubleshooting metadata'),
      meetingUrl: z.string().optional().describe('Conference meeting URL'),
      callProviderCode: z
        .string()
        .optional()
        .describe('Provider code for the conferencing or telephony system'),
      downloadMediaUrl: z
        .string()
        .optional()
        .describe('Public URL from which Gong should download the call media'),
      workspaceId: z.string().optional().describe('Workspace ID for the call'),
      languageCode: z.string().optional().describe('Language code for transcription'),
      primaryUser: z.string().describe('Gong user ID of the team member who hosted the call'),
      flowTaskId: z.string().optional().describe('Engage task ID to associate with the call')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Created Gong call ID'),
      requestId: z.string().optional().describe('Gong request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.createCall({
      clientUniqueId: ctx.input.clientUniqueId,
      title: ctx.input.title,
      purpose: ctx.input.purpose,
      scheduledStart: ctx.input.scheduledStart,
      scheduledEnd: ctx.input.scheduledEnd,
      actualStart: ctx.input.actualStart,
      duration: ctx.input.duration,
      parties: ctx.input.parties,
      direction: ctx.input.direction,
      disposition: ctx.input.disposition,
      context: ctx.input.context,
      customData: ctx.input.customData,
      meetingUrl: ctx.input.meetingUrl,
      callProviderCode: ctx.input.callProviderCode,
      downloadMediaUrl: ctx.input.downloadMediaUrl,
      workspaceId: ctx.input.workspaceId,
      languageCode: ctx.input.languageCode,
      primaryUser: ctx.input.primaryUser,
      flowContext: ctx.input.flowTaskId ? { taskId: ctx.input.flowTaskId } : undefined
    });

    return {
      output: {
        callId: result.callId,
        requestId: result.requestId
      },
      message: `Created Gong call${result.callId ? ` **${result.callId}**` : ''}.`
    };
  })
  .build();

export let addCallMedia = SlateTool.create(spec, {
  name: 'Add Call Media',
  key: 'add_call_media',
  description: `Upload a recording file for a Gong call created from an external recorder or telephony system.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      callId: z.string().describe('Gong call ID returned from create_call'),
      mediaFileBase64: z.string().min(1).describe('Base64-encoded audio or video file'),
      fileName: z.string().optional().describe('File name to send to Gong'),
      mimeType: z
        .string()
        .optional()
        .describe('Media MIME type, such as audio/mpeg, audio/wav, or video/mp4')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Gong call ID'),
      url: z.string().optional().describe('Gong web URL for the call'),
      requestId: z.string().optional().describe('Gong request ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.addCallMedia(ctx.input.callId, {
      mediaFileBase64: ctx.input.mediaFileBase64,
      fileName: ctx.input.fileName,
      mimeType: ctx.input.mimeType
    });

    return {
      output: {
        callId: result.callId || ctx.input.callId,
        url: result.url,
        requestId: result.requestId
      },
      message: `Uploaded media for Gong call **${ctx.input.callId}**.`
    };
  })
  .build();
