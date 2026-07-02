import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let recordingEvents = SlateTrigger.create(spec, {
  name: 'Recording Events',
  key: 'recording_events',
  description:
    'Triggers on Zoom cloud recording events: completed, started, stopped, paused, resumed, trashed, deleted, recovered, and transcript completed.'
})
  .input(
    z.object({
      eventType: z.string().describe('The specific event type (e.g., recording.completed)'),
      eventTimestamp: z.number().optional().describe('Event timestamp in milliseconds'),
      accountId: z.string().optional().describe('Zoom account ID'),
      recording: z.any().describe('Recording object from the webhook payload')
    })
  )
  .output(
    z.object({
      meetingId: z.number().optional().describe('Meeting ID'),
      meetingUuid: z.string().optional().describe('Meeting UUID'),
      topic: z.string().optional().describe('Meeting topic'),
      hostId: z.string().optional().describe('Host user ID'),
      hostEmail: z.string().optional().describe('Host email'),
      startTime: z.string().optional().describe('Recording start time'),
      duration: z.number().optional().describe('Meeting duration'),
      totalSize: z.number().optional().describe('Total recording size in bytes'),
      recordingCount: z.number().optional().describe('Number of recording files'),
      recordingFiles: z
        .array(
          z.object({
            recordingFileId: z.string().optional().describe('Recording file ID'),
            fileType: z.string().optional().describe('File type'),
            fileSize: z.number().optional().describe('File size in bytes'),
            downloadUrl: z.string().optional().describe('Download URL'),
            playUrl: z.string().optional().describe('Play URL'),
            recordingType: z.string().optional().describe('Type of recording'),
            recordingStart: z.string().optional().describe('Recording start time'),
            recordingEnd: z.string().optional().describe('Recording end time'),
            status: z.string().optional().describe('Recording status')
          })
        )
        .optional()
        .describe('Recording files (available on recording.completed)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.event === 'endpoint.url_validation') {
        return {
          inputs: [],
          response: new Response(
            JSON.stringify({
              plainToken: body.payload?.plainToken,
              encryptedToken: body.payload?.plainToken
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        };
      }

      let eventType = body.event as string;

      if (!eventType?.startsWith('recording.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventTimestamp: body.event_ts,
            accountId: body.payload?.account_id,
            recording: body.payload?.object || {}
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let rec = ctx.input.recording as any;

      let files = Array.isArray(rec?.recording_files) ? rec.recording_files : [];
      let recordingFiles = files.map((f: any) => ({
        recordingFileId: f.id as string | undefined,
        fileType: f.file_type as string | undefined,
        fileSize: f.file_size as number | undefined,
        downloadUrl: f.download_url as string | undefined,
        playUrl: f.play_url as string | undefined,
        recordingType: f.recording_type as string | undefined,
        recordingStart: f.recording_start as string | undefined,
        recordingEnd: f.recording_end as string | undefined,
        status: f.status as string | undefined
      }));

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${rec?.uuid || rec?.id}-${ctx.input.eventTimestamp || Date.now()}`,
        output: {
          meetingId: rec?.id as number | undefined,
          meetingUuid: rec?.uuid as string | undefined,
          topic: rec?.topic as string | undefined,
          hostId: rec?.host_id as string | undefined,
          hostEmail: rec?.host_email as string | undefined,
          startTime: (rec?.start_time || rec?.recording_start) as string | undefined,
          duration: rec?.duration as number | undefined,
          totalSize: rec?.total_size as number | undefined,
          recordingCount: rec?.recording_count as number | undefined,
          recordingFiles: recordingFiles.length > 0 ? recordingFiles : undefined
        }
      };
    }
  })
  .build();
