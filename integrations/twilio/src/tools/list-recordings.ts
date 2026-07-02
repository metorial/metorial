import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

let recordingSchema = z.object({
  recordingSid: z.string().describe('Unique SID of the recording (starts with RE)'),
  callSid: z.string().nullable().describe('Call SID associated with the recording'),
  conferenceSid: z
    .string()
    .nullable()
    .describe('Conference SID associated with the recording'),
  status: z.string().nullable().describe('Recording status'),
  source: z.string().nullable().describe('How the recording was created'),
  channels: z.number().nullable().describe('Number of audio channels'),
  duration: z.string().nullable().describe('Recording duration in seconds'),
  price: z.string().nullable().describe('Price charged for the recording'),
  priceUnit: z.string().nullable().describe('Currency of the price'),
  dateCreated: z.string().nullable().describe('Date the recording was created'),
  startTime: z.string().nullable().describe('Time recording started'),
  uri: z.string().nullable().describe('Recording resource URI')
});

export let listRecordings = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description: `Retrieve Twilio Programmable Voice recording metadata. Fetch one recording by SID, list account recordings, or list recordings for a specific call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingSid: z
        .string()
        .optional()
        .describe('Fetch a specific recording by SID (starts with RE).'),
      callSid: z
        .string()
        .optional()
        .describe('List recordings for a specific call SID (starts with CA).'),
      dateCreated: z
        .string()
        .optional()
        .describe('Filter recordings created on this date (YYYY-MM-DD).'),
      dateCreatedAfter: z
        .string()
        .optional()
        .describe('Filter recordings created after this date (YYYY-MM-DD).'),
      dateCreatedBefore: z
        .string()
        .optional()
        .describe('Filter recordings created before this date (YYYY-MM-DD).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of recordings to return per page (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      recordings: z.array(recordingSchema).describe('Recording metadata records'),
      hasMore: z.boolean().describe('Whether more recordings are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapRecording = (recording: any) => ({
      recordingSid: recording.sid,
      callSid: recording.call_sid || null,
      conferenceSid: recording.conference_sid || null,
      status: recording.status || null,
      source: recording.source || null,
      channels: recording.channels ?? null,
      duration: recording.duration || null,
      price: recording.price || null,
      priceUnit: recording.price_unit || null,
      dateCreated: recording.date_created || null,
      startTime: recording.start_time || null,
      uri: recording.uri || null
    });

    if (ctx.input.recordingSid) {
      let result = await client.getRecording(ctx.input.recordingSid);
      return {
        output: { recordings: [mapRecording(result)], hasMore: false },
        message: `Fetched recording **${result.sid}**.`
      };
    }

    let result = ctx.input.callSid
      ? await client.listCallRecordings(ctx.input.callSid, {
          pageSize: ctx.input.pageSize
        })
      : await client.listRecordings({
          dateCreated: ctx.input.dateCreated,
          dateCreatedAfter: ctx.input.dateCreatedAfter,
          dateCreatedBefore: ctx.input.dateCreatedBefore,
          pageSize: ctx.input.pageSize
        });

    let recordings = (result.recordings || []).map(mapRecording);
    return {
      output: { recordings, hasMore: !!result.next_page_uri },
      message: `Found **${recordings.length}** recording(s).`
    };
  })
  .build();
