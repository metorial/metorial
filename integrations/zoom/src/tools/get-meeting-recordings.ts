import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let getMeetingRecordings = SlateTool.create(spec, {
  name: 'Get Meeting Recordings',
  key: 'get_meeting_recordings',
  description: `Retrieve all cloud recording files for a specific meeting, including video, audio, chat, and transcript files with download URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      meetingId: z.string().describe('The meeting ID or UUID. Raw Zoom UUIDs are accepted.')
    })
  )
  .output(
    z.object({
      meetingId: z.number().optional().describe('Meeting ID'),
      uuid: z.string().optional().describe('Meeting UUID'),
      topic: z.string().optional().describe('Meeting topic'),
      hostId: z.string().optional().describe('Host user ID'),
      hostEmail: z.string().optional().describe('Host email'),
      startTime: z.string().optional().describe('Meeting start time'),
      duration: z.number().optional().describe('Meeting duration'),
      totalSize: z.number().optional().describe('Total file size in bytes'),
      recordingFiles: z
        .array(
          z.object({
            recordingFileId: z.string().optional().describe('Recording file ID'),
            recordingStart: z.string().optional().describe('Recording start time'),
            recordingEnd: z.string().optional().describe('Recording end time'),
            fileType: z.string().optional().describe('File type'),
            fileSize: z.number().optional().describe('File size in bytes'),
            downloadUrl: z.string().optional().describe('Download URL'),
            playUrl: z.string().optional().describe('Play URL'),
            status: z.string().optional().describe('Recording status'),
            recordingType: z.string().optional().describe('Type of recording')
          })
        )
        .describe('List of recording files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.getMeetingRecordings(ctx.input.meetingId);

    let recordingFiles = (result.recording_files || []).map((f: any) => ({
      recordingFileId: f.id,
      recordingStart: f.recording_start,
      recordingEnd: f.recording_end,
      fileType: f.file_type,
      fileSize: f.file_size,
      downloadUrl: f.download_url,
      playUrl: f.play_url,
      status: f.status,
      recordingType: f.recording_type
    }));

    return {
      output: {
        meetingId: result.id,
        uuid: result.uuid,
        topic: result.topic,
        hostId: result.host_id,
        hostEmail: result.host_email,
        startTime: result.start_time,
        duration: result.duration,
        totalSize: result.total_size,
        recordingFiles
      },
      message: `Found **${recordingFiles.length}** recording file(s) for meeting **${result.topic || ctx.input.meetingId}**.`
    };
  })
  .build();
