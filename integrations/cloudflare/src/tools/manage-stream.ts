import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageStreamTool = SlateTool.create(spec, {
  name: 'Manage Stream Videos',
  key: 'manage_stream',
  description: `List, view, or delete Cloudflare Stream videos. Also manage live inputs for live streaming. Stream provides video encoding, storage, and delivery at the edge.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_videos',
          'get_video',
          'delete_video',
          'list_live_inputs',
          'create_live_input',
          'delete_live_input'
        ])
        .describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      videoId: z.string().optional().describe('Video ID for get/delete'),
      liveInputId: z.string().optional().describe('Live input ID for delete'),
      meta: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata key-value pairs for live input'),
      recordingMode: z
        .enum(['off', 'automatic'])
        .optional()
        .describe('Recording mode for live input (off, automatic)')
    })
  )
  .output(
    z.object({
      videos: z
        .array(
          z.object({
            videoId: z.string(),
            name: z.string().optional(),
            status: z.string().optional(),
            duration: z.number().optional(),
            size: z.number().optional(),
            readyToStream: z.boolean().optional(),
            createdAt: z.string().optional(),
            playbackUrl: z.string().optional()
          })
        )
        .optional(),
      video: z
        .object({
          videoId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          duration: z.number().optional(),
          readyToStream: z.boolean().optional(),
          playbackUrl: z.string().optional(),
          thumbnailUrl: z.string().optional()
        })
        .optional(),
      liveInputs: z
        .array(
          z.object({
            liveInputId: z.string(),
            createdAt: z.string().optional(),
            rtmpsUrl: z.string().optional(),
            rtmpsKey: z.string().optional()
          })
        )
        .optional(),
      liveInput: z
        .object({
          liveInputId: z.string(),
          rtmpsUrl: z.string().optional(),
          rtmpsKey: z.string().optional(),
          srtUrl: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list_videos') {
      let response = await client.listStreamVideos(accountId);
      let videos = response.result.map((v: any) => ({
        videoId: v.uid,
        name: v.meta?.name,
        status: v.status?.state,
        duration: v.duration,
        size: v.size,
        readyToStream: v.readyToStream,
        createdAt: v.created,
        playbackUrl: v.playback?.hls
      }));
      return {
        output: { videos },
        message: `Found **${videos.length}** video(s).`
      };
    }

    if (action === 'get_video') {
      if (!ctx.input.videoId) throw cloudflareServiceError('videoId is required');
      let response = await client.getStreamVideo(accountId, ctx.input.videoId);
      let v = response.result;
      return {
        output: {
          video: {
            videoId: v.uid,
            name: v.meta?.name,
            status: v.status?.state,
            duration: v.duration,
            readyToStream: v.readyToStream,
            playbackUrl: v.playback?.hls,
            thumbnailUrl: v.thumbnail
          }
        },
        message: `Video **${v.meta?.name || v.uid}** — Status: ${v.status?.state}, Duration: ${v.duration || 'N/A'}s`
      };
    }

    if (action === 'delete_video') {
      if (!ctx.input.videoId) throw cloudflareServiceError('videoId is required');
      await client.deleteStreamVideo(accountId, ctx.input.videoId);
      return {
        output: { deleted: true },
        message: `Deleted video \`${ctx.input.videoId}\`.`
      };
    }

    if (action === 'list_live_inputs') {
      let response = await client.listStreamLiveInputs(accountId);
      let liveInputs = (response.result.liveInputs ?? []).map((li: any) => ({
        liveInputId: li.uid,
        createdAt: li.created,
        rtmpsUrl: li.rtmps?.url,
        rtmpsKey: li.rtmps?.streamKey
      }));
      return {
        output: { liveInputs },
        message: `Found **${liveInputs.length}** live input(s).`
      };
    }

    if (action === 'create_live_input') {
      let response = await client.createStreamLiveInput(accountId, {
        meta: ctx.input.meta,
        recording: ctx.input.recordingMode ? { mode: ctx.input.recordingMode } : undefined
      });
      let li = response.result;
      return {
        output: {
          liveInput: {
            liveInputId: li.uid,
            rtmpsUrl: li.rtmps?.url,
            rtmpsKey: li.rtmps?.streamKey,
            srtUrl: li.srt?.url
          }
        },
        message: `Created live input \`${li.uid}\`.`
      };
    }

    if (action === 'delete_live_input') {
      if (!ctx.input.liveInputId) throw cloudflareServiceError('liveInputId is required');
      await client.deleteStreamLiveInput(accountId, ctx.input.liveInputId);
      return {
        output: { deleted: true },
        message: `Deleted live input \`${ctx.input.liveInputId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
