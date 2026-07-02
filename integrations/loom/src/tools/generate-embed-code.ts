import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  buildEmbedIframe,
  buildEmbedUrl,
  extractVideoId,
  isValidLoomUrl
} from '../lib/client';
import { spec } from '../spec';

export let generateEmbedCode = SlateTool.create(spec, {
  name: 'Generate Embed Code',
  key: 'generate_embed_code',
  description: `Generate an embeddable iframe HTML snippet or embed URL for a Loom video. Supports customization such as fixed or responsive dimensions, autoplay, hiding the top bar, and setting a start time. Use this when you need to embed a Loom video into a webpage or application.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      videoUrl: z
        .string()
        .describe(
          'Loom video URL (share or embed format, e.g. https://www.loom.com/share/abc123)'
        ),
      width: z
        .number()
        .optional()
        .describe('Fixed width in pixels for the iframe. Omit for responsive sizing.'),
      height: z
        .number()
        .optional()
        .describe('Fixed height in pixels for the iframe. Omit for responsive sizing.'),
      hideTopBar: z
        .boolean()
        .optional()
        .describe('Hide the top bar of the embedded video player'),
      autoplay: z.boolean().optional().describe('Automatically start playing when loaded'),
      startTime: z.string().optional().describe('Start time offset (e.g. "20s", "1m30s")'),
      format: z
        .enum(['html', 'url'])
        .optional()
        .describe(
          'Output format: "html" for a full iframe snippet (default), "url" for the raw embed URL'
        )
    })
  )
  .output(
    z.object({
      videoId: z.string().describe('Extracted Loom video ID'),
      embedUrl: z.string().describe('Direct embed URL for the video'),
      embedHtml: z.string().describe('Ready-to-use HTML iframe snippet'),
      shareUrl: z.string().describe('Shareable Loom URL for the video')
    })
  )
  .handleInvocation(async ctx => {
    if (!isValidLoomUrl(ctx.input.videoUrl)) {
      throw new Error(
        `Invalid Loom URL: "${ctx.input.videoUrl}". Expected format: https://www.loom.com/share/{videoId} or https://www.loom.com/embed/{videoId}`
      );
    }

    let videoId = extractVideoId(ctx.input.videoUrl);
    if (!videoId) {
      throw new Error(`Could not extract video ID from URL: "${ctx.input.videoUrl}"`);
    }

    let embedOptions = {
      hideTopBar: ctx.input.hideTopBar,
      autoplay: ctx.input.autoplay,
      startTime: ctx.input.startTime
    };

    let embedUrl = buildEmbedUrl(videoId, embedOptions);
    let embedHtml = buildEmbedIframe(videoId, {
      ...embedOptions,
      width: ctx.input.width,
      height: ctx.input.height
    });

    let format = ctx.input.format ?? 'html';
    let outputDescription =
      format === 'url'
        ? `Generated embed URL for video \`${videoId}\`.`
        : `Generated responsive embed HTML for video \`${videoId}\`.`;

    return {
      output: {
        videoId,
        embedUrl,
        embedHtml,
        shareUrl: `https://www.loom.com/share/${videoId}`
      },
      message: outputDescription
    };
  })
  .build();
