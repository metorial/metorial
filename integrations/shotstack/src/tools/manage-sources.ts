import { SlateTool } from 'slates';
import { z } from 'zod';
import { IngestClient, record, records, text } from '../lib/client';
import { attachUrl } from '../lib/files';
import { spec } from '../spec';

let renditionSchema = z.object({
  format: z.string().optional().describe('Output format (e.g. mp4, webm, jpg, png)'),
  resolution: z
    .enum(['preview', 'mobile', 'sd', 'hd', '1080'])
    .optional()
    .describe('Resolution preset'),
  size: z
    .object({
      width: z.number().optional().describe('Width in pixels'),
      height: z.number().optional().describe('Height in pixels')
    })
    .optional()
    .describe('Custom output size'),
  fit: z.enum(['cover', 'contain', 'crop', 'none']).optional().describe('Resize fit mode'),
  quality: z.number().optional().describe('Quality (1-100)'),
  fps: z.number().optional().describe('Frames per second'),
  speed: z
    .object({
      speed: z.number().describe('Speed multiplier'),
      preservePitch: z
        .boolean()
        .optional()
        .describe('Preserve audio pitch when changing speed')
    })
    .optional()
    .describe('Speed adjustment'),
  filename: z.string().optional().describe('Custom output filename (without extension)')
});

let destinationSchema = z.object({
  provider: z
    .enum(['shotstack', 's3', 'mux', 'google-cloud-storage', 'google-drive', 'vimeo'])
    .describe('Destination provider'),
  exclude: z.boolean().optional().describe('Exclude this destination'),
  options: z.record(z.string(), z.any()).optional().describe('Provider-specific options')
});

export let ingestSourceTool = SlateTool.create(spec, {
  name: 'Ingest Source',
  key: 'ingest_source',
  description: `Fetch and ingest a media file from a URL. Optionally apply transformations (renditions) like format conversion, resizing, and speed changes. The source is stored by Shotstack and can be used directly in edits.`,
  instructions: [
    'Renditions are optional transformations applied during ingestion.',
    'Sources are stored until explicitly deleted.',
    'The ingested source URL can be used directly in edit timelines.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('Public URL of the media file to ingest'),
      renditions: z
        .array(renditionSchema)
        .optional()
        .describe('Transformations to apply during ingestion'),
      transcription: z
        .object({
          format: z.enum(['srt', 'vtt', 'json']).describe('Transcription output format')
        })
        .optional()
        .describe('Request a transcription of the media'),
      destinations: z.array(destinationSchema).optional().describe('Output destinations'),
      callback: z
        .string()
        .optional()
        .describe('Webhook URL for ingestion completion notifications')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('ID of the ingested source')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IngestClient(ctx.auth.token, ctx.config.environment);

    let body: Record<string, any> = { url: ctx.input.url };
    let outputs: Record<string, any> = {};

    if (ctx.input.renditions) outputs.renditions = ctx.input.renditions;
    if (ctx.input.transcription) outputs.transcription = ctx.input.transcription;
    if (Object.keys(outputs).length > 0) body.outputs = outputs;
    if (ctx.input.destinations) body.destinations = ctx.input.destinations;
    if (ctx.input.callback) body.callback = ctx.input.callback;

    let result = await client.fetchSource(body);

    return {
      output: {
        sourceId: result.data.id
      },
      message: `Source ingestion queued with ID **${result.data.id}**.`
    };
  })
  .build();

export let getSourceTool = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieve details of an ingested source including status, dimensions, duration, rendition outputs, and transcription results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('The source ID to look up')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('Source ID'),
      status: z.string().describe('Source status (queued, importing, ready, failed, deleted)'),
      inputUrl: z.string().optional().describe('Original input URL'),
      sourceUrl: z.string().optional().describe('Stored source URL'),
      width: z.number().optional().describe('Media width in pixels'),
      height: z.number().optional().describe('Media height in pixels'),
      duration: z.number().optional().describe('Duration in seconds'),
      fps: z.number().optional().describe('Frames per second'),
      outputs: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rendition and transcription output details'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IngestClient(ctx.auth.token, ctx.config.environment);
    let result = await client.getSource(ctx.input.sourceId);

    let attrs = record(result.data.attributes, 'source attributes');
    if (attrs.status === 'ready') {
      if (typeof attrs.source === 'string') await attachUrl(ctx, attrs.source);
      if (attrs.outputs && typeof attrs.outputs === 'object') {
        for (let rendition of Array.isArray(attrs.outputs.renditions)
          ? attrs.outputs.renditions
          : []) {
          if (rendition?.status === 'ready' && typeof rendition.url === 'string')
            await attachUrl(ctx, rendition.url);
        }
        if (typeof attrs.outputs.transcription?.url === 'string')
          await attachUrl(ctx, attrs.outputs.transcription.url);
      }
    }

    return {
      output: {
        sourceId: text(attrs.id ?? result.data.id, 'source ID'),
        status: text(attrs.status, 'source status'),
        inputUrl: attrs.input,
        sourceUrl: attrs.source,
        width: attrs.width,
        height: attrs.height,
        duration: attrs.duration,
        fps: attrs.fps,
        outputs: attrs.outputs,
        created: attrs.created,
        updated: attrs.updated
      },
      message: `Source **${text(attrs.id ?? result.data.id, 'source ID')}** is **${attrs.status}**.`
    };
  })
  .build();

export let listSourcesTool = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `List all ingested sources. Returns source IDs, status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.string().describe('Source ID'),
            status: z.string().optional().describe('Source status'),
            inputUrl: z.string().optional().describe('Original input URL'),
            width: z.number().optional().describe('Width in pixels'),
            height: z.number().optional().describe('Height in pixels'),
            duration: z.number().optional().describe('Duration in seconds'),
            created: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IngestClient(ctx.auth.token, ctx.config.environment);
    let result = await client.listSources();

    let sources = records(result.data, 'sources').map(s => {
      let attrs = record(s.attributes, 'source attributes');
      return {
        sourceId: text(attrs.id ?? s.id, 'source ID'),
        status: attrs.status,
        inputUrl: attrs.input,
        width: attrs.width,
        height: attrs.height,
        duration: attrs.duration,
        created: attrs.created
      };
    });

    return {
      output: { sources },
      message: `Found **${sources.length}** source(s).`
    };
  })
  .build();

export let deleteSourceTool = SlateTool.create(spec, {
  name: 'Delete Source',
  key: 'delete_source',
  description: `Permanently delete an ingested source and its stored files.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('The source ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IngestClient(ctx.auth.token, ctx.config.environment);
    await client.deleteSource(ctx.input.sourceId);

    return {
      output: { success: true },
      message: `Source **${ctx.input.sourceId}** deleted.`
    };
  })
  .build();

export let requestUploadUrlTool = SlateTool.create(spec, {
  name: 'Request Upload URL',
  key: 'request_upload_url',
  description: `Request a signed URL for direct file upload. Upload your file to the returned URL with a PUT request. Optionally specify renditions to apply after upload.`,
  instructions: [
    'Upload your file to the returned URL using an HTTP PUT request.',
    'Do NOT include a Content-Type header when uploading.',
    'The signed URL expires after a short time period.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      renditions: z
        .array(renditionSchema)
        .optional()
        .describe('Transformations to apply after upload')
    })
  )
  .output(
    z.object({
      sourceId: z.string().describe('ID for the upload source'),
      uploadUrl: z.string().describe('Signed URL for uploading the file'),
      expires: z.string().optional().describe('Upload URL expiration timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IngestClient(ctx.auth.token, ctx.config.environment);

    let body: Record<string, any> = {};
    if (ctx.input.renditions) {
      body.outputs = { renditions: ctx.input.renditions };
    }

    let result = await client.requestUploadUrl(body);

    let attrs = record(result.data.attributes, 'source attributes');

    return {
      output: {
        sourceId: text(attrs.id ?? result.data.id, 'source ID'),
        uploadUrl: text(attrs.url, 'upload URL'),
        expires: attrs.expires
      },
      message: `Upload URL ready for source **${text(attrs.id ?? result.data.id, 'source ID')}**. Upload your file with a PUT request to the URL.`
    };
  })
  .build();
