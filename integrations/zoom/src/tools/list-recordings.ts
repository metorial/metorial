import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listRecordings = SlateTool.create(spec, {
  name: 'List Recordings',
  key: 'list_recordings',
  description: `List cloud recordings for a Zoom user within a date range. Returns recording metadata including download URLs, file types, and sizes. Useful for finding specific meeting recordings or batch processing.`,
  constraints: ['Requires Pro, Business, or Enterprise account for cloud recording'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      from: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD). Defaults to current date'),
      to: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to current date'),
      pageSize: z.number().optional().describe('Number of records per page (max 300)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of recordings'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      from: z.string().optional().describe('Start date of the range'),
      to: z.string().optional().describe('End date of the range'),
      meetings: z
        .array(
          z.object({
            meetingId: z.number().optional().describe('Meeting ID'),
            uuid: z.string().optional().describe('Meeting UUID'),
            topic: z.string().optional().describe('Meeting topic'),
            startTime: z.string().optional().describe('Meeting start time'),
            duration: z.number().optional().describe('Meeting duration'),
            totalSize: z.number().optional().describe('Total file size in bytes'),
            recordingCount: z.number().optional().describe('Number of recording files'),
            recordingFiles: z
              .array(
                z.object({
                  recordingFileId: z.string().optional().describe('Recording file ID'),
                  recordingStart: z.string().optional().describe('Recording start time'),
                  recordingEnd: z.string().optional().describe('Recording end time'),
                  fileType: z
                    .string()
                    .optional()
                    .describe('File type (MP4, M4A, CHAT, TRANSCRIPT, etc.)'),
                  fileSize: z.number().optional().describe('File size in bytes'),
                  downloadUrl: z.string().optional().describe('Download URL'),
                  playUrl: z.string().optional().describe('Play URL'),
                  status: z.string().optional().describe('Recording status'),
                  recordingType: z.string().optional().describe('Type of recording')
                })
              )
              .optional()
              .describe('Recording files')
          })
        )
        .describe('List of meetings with recordings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listRecordings(ctx.input.userId, {
      from: ctx.input.from,
      to: ctx.input.to,
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let meetings = (result.meetings || []).map((m: any) => ({
      meetingId: m.id,
      uuid: m.uuid,
      topic: m.topic,
      startTime: m.start_time,
      duration: m.duration,
      totalSize: m.total_size,
      recordingCount: m.recording_count,
      recordingFiles: (m.recording_files || []).map((f: any) => ({
        recordingFileId: f.id,
        recordingStart: f.recording_start,
        recordingEnd: f.recording_end,
        fileType: f.file_type,
        fileSize: f.file_size,
        downloadUrl: f.download_url,
        playUrl: f.play_url,
        status: f.status,
        recordingType: f.recording_type
      }))
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        from: result.from,
        to: result.to,
        meetings
      },
      message: `Found **${meetings.length}** meeting(s) with recordings${result.total_records ? ` (${result.total_records} total)` : ''}.`
    };
  })
  .build();
