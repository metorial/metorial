import { createBase64Attachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { geminiServiceError } from '../lib/errors';
import { createClient, sleep } from '../lib/helpers';
import { spec } from '../spec';

const WAIT_POLL_INTERVAL_SECONDS = 5;
const MAX_WAIT_SECONDS = 60;

const imageMimeTypeSchema = z.enum(['image/png', 'image/jpeg']);

let modelId = (model: string) => model.replace(/^models\//, '');

let requireV1Beta = (apiVersion: string) => {
  if (apiVersion !== 'v1beta') {
    throw geminiServiceError(
      'Veo video generation is available through Gemini Developer API v1beta. Set apiVersion to "v1beta".'
    );
  }
};

let validateBase64 = (value: string, fieldName: string) => {
  let normalized = value.replace(/\s/g, '');
  if (
    normalized.length === 0 ||
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw geminiServiceError(`${fieldName} must contain valid base64-encoded image bytes.`);
  }
};

let validateVideoOptions = (input: {
  model: string;
  imageBase64?: string;
  imageMimeType?: string;
  lastFrameBase64?: string;
  lastFrameMimeType?: string;
  aspectRatio?: '16:9' | '9:16';
  durationSeconds?: 4 | 5 | 6 | 7 | 8;
  resolution?: '720p' | '1080p' | '4k';
  seed?: number;
  numberOfVideos?: number;
}) => {
  let model = modelId(input.model);

  if (!/^veo-[A-Za-z0-9._-]+$/.test(model)) {
    throw geminiServiceError(
      'model must be a Gemini Developer API Veo model ID such as "veo-3.1-generate-preview".'
    );
  }
  if (Boolean(input.imageBase64) !== Boolean(input.imageMimeType)) {
    throw geminiServiceError(
      'imageBase64 and imageMimeType must be provided together for image-to-video generation.'
    );
  }
  if (Boolean(input.lastFrameBase64) !== Boolean(input.lastFrameMimeType)) {
    throw geminiServiceError(
      'lastFrameBase64 and lastFrameMimeType must be provided together for frame interpolation.'
    );
  }
  if (input.lastFrameBase64 && !input.imageBase64) {
    throw geminiServiceError(
      'imageBase64 and imageMimeType are required when a last frame is provided.'
    );
  }
  if (input.imageBase64) validateBase64(input.imageBase64, 'imageBase64');
  if (input.lastFrameBase64) validateBase64(input.lastFrameBase64, 'lastFrameBase64');

  if (model.startsWith('veo-2.')) {
    if (input.durationSeconds === 4) {
      throw geminiServiceError('Veo 2 supports durationSeconds values 5, 6, 7, or 8.');
    }
    if (input.resolution) {
      throw geminiServiceError(
        'The Gemini Developer API does not support resolution for Veo 2.'
      );
    }
    if (input.seed !== undefined) {
      throw geminiServiceError('seed is supported by Veo 3 models, not Veo 2.');
    }
  } else {
    if (input.durationSeconds === 5 || input.durationSeconds === 7) {
      throw geminiServiceError('Veo 3 and later models support 4, 6, or 8 second videos.');
    }
    if ((input.numberOfVideos ?? 1) !== 1) {
      throw geminiServiceError('Current Veo 3 models generate exactly one video per request.');
    }
  }

  if (model.startsWith('veo-3.0-')) {
    if (input.durationSeconds !== undefined && input.durationSeconds !== 8) {
      throw geminiServiceError('Veo 3.0 supports only 8 second video generation.');
    }
    if (input.resolution === '4k') {
      throw geminiServiceError('Veo 3.0 does not support 4k output.');
    }
    if (input.resolution === '1080p' && input.aspectRatio === '9:16') {
      throw geminiServiceError('Veo 3.0 supports 1080p output only at 16:9.');
    }
  }
  if (model.includes('-lite-') && input.resolution === '4k') {
    throw geminiServiceError('Veo Lite models do not support 4k output.');
  }
  if (
    (input.resolution === '1080p' || input.resolution === '4k') &&
    input.durationSeconds !== undefined &&
    input.durationSeconds !== 8
  ) {
    throw geminiServiceError('1080p and 4k Veo output requires durationSeconds to be 8.');
  }
};

let terminalOperationError = (operation: any) => {
  let error = operation?.error;
  if (!error) return undefined;

  let message =
    typeof error.message === 'string' ? error.message : 'Unknown Veo operation error';
  let status = typeof error.status === 'string' ? ` (${error.status})` : '';
  let code = typeof error.code === 'number' ? ` [code ${error.code}]` : '';
  return `${message}${status}${code}`;
};

export let generateVideo = SlateTool.create(spec, {
  name: 'Generate Video',
  key: 'generate_video',
  description:
    'Start asynchronous text-to-video, image-to-video, or first/last-frame video generation with a Gemini Developer API Veo model. Returns a long-running operation name for get_video_operation.',
  instructions: [
    'Use a current Veo model such as "veo-3.1-generate-preview" or "veo-3.1-fast-generate-preview".',
    'Call get_video_operation with the returned operationName until done is true. Veo jobs can take up to several minutes.',
    'Use imageBase64 with imageMimeType to animate a starting image. A last frame additionally requires lastFrameBase64 and lastFrameMimeType.',
    'Set waitSeconds (up to 60) to poll the operation briefly before returning; most Veo jobs take longer, so still poll with get_video_operation until done is true.'
  ],
  constraints: [
    'Veo is a paid, quota-limited Gemini API capability and may not be enabled for every API key.',
    'Veo video generation requires the integration apiVersion to be v1beta.',
    'Generated videos are retained by Gemini for a limited time and should be downloaded promptly.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .min(1)
        .describe(
          'Veo model ID, with or without the models/ prefix (for example "veo-3.1-generate-preview")'
        ),
      prompt: z
        .string()
        .min(1)
        .describe(
          'Text description of the video, including any desired dialogue or audio cues'
        ),
      imageBase64: z
        .string()
        .optional()
        .describe('Base64-encoded PNG or JPEG starting frame for image-to-video generation'),
      imageMimeType: imageMimeTypeSchema
        .optional()
        .describe('MIME type for imageBase64; required when imageBase64 is provided'),
      lastFrameBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded PNG or JPEG final frame for interpolation; requires a starting image'
        ),
      lastFrameMimeType: imageMimeTypeSchema
        .optional()
        .describe('MIME type for lastFrameBase64; required when lastFrameBase64 is provided'),
      negativePrompt: z
        .string()
        .optional()
        .describe('Content or visual qualities to discourage in the generated video'),
      aspectRatio: z
        .enum(['16:9', '9:16'])
        .optional()
        .describe('Output aspect ratio; defaults to 16:9 when omitted'),
      durationSeconds: z
        .union([z.literal(4), z.literal(5), z.literal(6), z.literal(7), z.literal(8)])
        .optional()
        .describe(
          'Video duration in seconds. Veo 3.1 supports 4, 6, or 8; Veo 2 supports 5, 6, 7, or 8.'
        ),
      resolution: z
        .enum(['720p', '1080p', '4k'])
        .optional()
        .describe(
          'Output resolution for supported Veo 3 models. 1080p and 4k require an 8 second duration.'
        ),
      personGeneration: z
        .enum(['allow_all', 'allow_adult', 'dont_allow'])
        .optional()
        .describe(
          'Person-generation policy. Allowed values depend on model, input mode, and request region.'
        ),
      seed: z
        .number()
        .int()
        .min(0)
        .max(4_294_967_295)
        .optional()
        .describe(
          'Optional seed for Veo 3 models; improves repeatability but is not deterministic'
        ),
      numberOfVideos: z
        .number()
        .int()
        .min(1)
        .max(2)
        .optional()
        .describe(
          'Number of videos to generate. Current Veo 3 models support 1; Veo 2 supports up to 2.'
        ),
      waitSeconds: z
        .number()
        .int()
        .min(0)
        .max(MAX_WAIT_SECONDS)
        .optional()
        .describe(
          'Optional bounded wait in seconds (0-60, default 0). When greater than 0, the operation is polled about every 5 seconds up to this bound and the last observed state is returned.'
        )
    })
  )
  .output(
    z.object({
      operationName: z
        .string()
        .describe('Long-running Veo operation resource name for get_video_operation'),
      done: z
        .boolean()
        .describe(
          'Whether the operation was complete in the last observed state (the initial response, or the final poll of the optional waitSeconds window)'
        )
    })
  )
  .handleInvocation(async ctx => {
    requireV1Beta(ctx.config.apiVersion);
    validateVideoOptions(ctx.input);

    let client = createClient(ctx);
    let operation = await client.generateVeoVideo(ctx.input.model, {
      prompt: ctx.input.prompt,
      image:
        ctx.input.imageBase64 && ctx.input.imageMimeType
          ? {
              mimeType: ctx.input.imageMimeType,
              data: ctx.input.imageBase64.replace(/\s/g, '')
            }
          : undefined,
      lastFrame:
        ctx.input.lastFrameBase64 && ctx.input.lastFrameMimeType
          ? {
              mimeType: ctx.input.lastFrameMimeType,
              data: ctx.input.lastFrameBase64.replace(/\s/g, '')
            }
          : undefined,
      negativePrompt: ctx.input.negativePrompt,
      aspectRatio: ctx.input.aspectRatio,
      durationSeconds: ctx.input.durationSeconds,
      resolution: ctx.input.resolution,
      personGeneration: ctx.input.personGeneration,
      seed: ctx.input.seed,
      numberOfVideos: ctx.input.numberOfVideos
    });

    if (typeof operation?.name !== 'string' || !operation.name) {
      throw geminiServiceError(
        'Gemini accepted the Veo request but did not return an operation name.'
      );
    }

    let operationName = operation.name;
    if (operation.done === true) {
      return {
        output: {
          operationName,
          done: true
        },
        message: `Veo operation **${operationName}** completed immediately. Call get_video_operation to download its output.`
      };
    }

    let waitSeconds = ctx.input.waitSeconds ?? 0;
    if (waitSeconds > 0) {
      let remainingPolls = Math.ceil(waitSeconds / WAIT_POLL_INTERVAL_SECONDS);
      let done = false;

      while (remainingPolls > 0 && !done) {
        remainingPolls -= 1;
        await sleep(WAIT_POLL_INTERVAL_SECONDS * 1000);
        let polled = await client.getVideoOperation(operationName);
        if (polled?.done !== true) continue;

        let operationError = terminalOperationError(polled);
        if (operationError) {
          throw geminiServiceError(`Veo operation ${operationName} failed: ${operationError}`);
        }
        done = true;
      }

      return {
        output: {
          operationName,
          done
        },
        message: done
          ? `Started Veo video generation as **${operationName}**; it completed within the ${waitSeconds}s wait. Call get_video_operation to download the finished video.`
          : `Started Veo video generation as **${operationName}**; it was still running after waiting ${waitSeconds}s. Call get_video_operation to check progress and download the finished video.`
      };
    }

    return {
      output: {
        operationName,
        done: false
      },
      message: `Started Veo video generation as **${operationName}**. Call get_video_operation to check progress and download the finished video.`
    };
  })
  .build();

let operationFileStem = (operationName: string) => {
  let id = operationName.split('/').at(-1) ?? 'video';
  return id.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100) || 'video';
};

export let getVideoOperation = SlateTool.create(spec, {
  name: 'Get Video Operation',
  key: 'get_video_operation',
  description:
    'Get the current state of a Veo long-running operation. When generation succeeds, downloads each generated MP4 and returns its bytes only as Slate attachments.',
  instructions: [
    'Pass the exact operationName returned by generate_video.',
    'If done is false, wait before calling this tool again. Google recommends polling at roughly 10-second intervals.',
    'When done is true, use the returned attachments immediately because Gemini retains generated videos for a limited time.'
  ],
  constraints: [
    'Each generated MP4 download is limited to 512 MiB before attachment creation.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      operationName: z
        .string()
        .min(1)
        .describe('Veo operation resource name returned by generate_video')
    })
  )
  .output(
    z.object({
      operationName: z.string().describe('Veo operation resource name'),
      done: z.boolean().describe('Whether video generation has finished'),
      videos: z
        .array(
          z.object({
            attachmentIndex: z
              .number()
              .describe('Index of this video in the Slate attachments'),
            fileName: z.string().describe('Suggested MP4 file name'),
            mimeType: z.literal('video/mp4').describe('MIME type of the video attachment'),
            sizeBytes: z.number().describe('Decoded video byte size')
          })
        )
        .describe('Generated video attachment metadata; empty while the operation is pending'),
      attachmentCount: z.number().describe('Number of generated video attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    requireV1Beta(ctx.config.apiVersion);

    let client = createClient(ctx);
    let operation = await client.getVideoOperation(ctx.input.operationName);
    let operationName =
      typeof operation?.name === 'string' && operation.name
        ? operation.name
        : ctx.input.operationName;

    if (operation.done !== true) {
      return {
        output: {
          operationName,
          done: false,
          videos: [],
          attachmentCount: 0
        },
        message: `Veo operation **${operationName}** is still running.`
      };
    }

    let operationError = terminalOperationError(operation);
    if (operationError) {
      throw geminiServiceError(`Veo operation ${operationName} failed: ${operationError}`);
    }

    let samples = operation.response?.generateVideoResponse?.generatedSamples;
    if (!Array.isArray(samples) || samples.length === 0) {
      let filteredReasons = operation.response?.generateVideoResponse?.raiMediaFilteredReasons;
      let suffix =
        Array.isArray(filteredReasons) && filteredReasons.length > 0
          ? ` Filter reasons: ${filteredReasons.join('; ')}`
          : '';
      throw geminiServiceError(
        `Veo operation ${operationName} completed without a generated video.${suffix}`
      );
    }

    let attachments: ReturnType<typeof createBase64Attachment>[] = [];
    let videos: Array<{
      attachmentIndex: number;
      fileName: string;
      mimeType: 'video/mp4';
      sizeBytes: number;
    }> = [];
    let fileStem = operationFileStem(operationName);

    for (let [index, sample] of samples.entries()) {
      let uri = sample?.video?.uri;
      if (typeof uri !== 'string' || !uri) {
        throw geminiServiceError(
          `Veo operation ${operationName} returned generated sample ${index + 1} without a download URL.`
        );
      }

      let downloaded = await client.downloadVeoVideo(uri);
      let attachmentIndex = attachments.length;
      attachments.push(
        createBase64Attachment(downloaded.content.toString('base64'), downloaded.mimeType)
      );
      videos.push({
        attachmentIndex,
        fileName: `${fileStem}-${index + 1}.mp4`,
        mimeType: downloaded.mimeType,
        sizeBytes: downloaded.content.length
      });
    }

    return {
      output: {
        operationName,
        done: true,
        videos,
        attachmentCount: attachments.length
      },
      attachments,
      message: `Veo operation **${operationName}** completed with **${attachments.length}** video attachment(s).`
    };
  })
  .build();
