import { SlateTool } from 'slates';
import { z } from 'zod';
import { PhotoshopClient } from '../lib/photoshop';
import { spec } from '../spec';

let storageRefSchema = z.object({
  href: z.string().describe('URL or path to the file (pre-signed URL for cloud storage)'),
  storage: z.enum(['external', 'azure', 'dropbox']).describe('Storage type')
});

export let editPsd = SlateTool.create(spec, {
  name: 'Edit PSD',
  key: 'edit_psd',
  description: `Perform programmatic edits on PSD files including layer manipulation, text layer editing, smart object replacement, applying Photoshop actions, and creating renditions. Supports multiple operation types in a single call. All operations are asynchronous — poll the returned status URL for results.`,
  instructions: [
    'Files must be on supported cloud storage (S3, Azure, Dropbox) with pre-signed URLs.',
    'For text edits, specify the layer by name or ID along with the new text content.',
    'For smart object replacement, provide the replacement image reference.',
    'For renditions, specify the output format (jpeg, png, tiff) and optional dimensions.'
  ],
  constraints: [
    'PSD files must be accessible via pre-signed URLs from supported cloud storage.'
  ]
})
  .input(
    z.object({
      operation: z
        .enum([
          'editLayers',
          'editText',
          'replaceSmartObject',
          'createRendition',
          'applyActions',
          'getManifest'
        ])
        .describe('Type of PSD operation to perform'),
      input: storageRefSchema.describe('Source PSD file location'),
      output: storageRefSchema
        .optional()
        .describe('Output file location (not needed for getManifest)'),
      layers: z
        .array(
          z.object({
            name: z.string().optional().describe('Layer name'),
            layerId: z.number().optional().describe('Layer ID'),
            visible: z.boolean().optional().describe('Layer visibility'),
            locked: z.boolean().optional().describe('Layer lock state'),
            opacity: z.number().optional().describe('Layer opacity (0-100)')
          })
        )
        .optional()
        .describe('Layer modifications for editLayers operation'),
      textLayers: z
        .array(
          z.object({
            name: z.string().optional().describe('Text layer name'),
            layerId: z.number().optional().describe('Text layer ID'),
            content: z.string().describe('New text content')
          })
        )
        .optional()
        .describe('Text layer modifications for editText operation'),
      smartObject: z
        .object({
          name: z.string().optional().describe('Smart object layer name'),
          layerId: z.number().optional().describe('Smart object layer ID'),
          replacement: storageRefSchema.describe('Replacement image for the smart object')
        })
        .optional()
        .describe('Smart object replacement details'),
      renditionFormat: z
        .enum(['jpeg', 'png', 'tiff'])
        .optional()
        .describe('Output format for createRendition'),
      renditionWidth: z.number().optional().describe('Output width for createRendition'),
      renditionQuality: z
        .number()
        .optional()
        .describe('JPEG quality (1-100) for createRendition'),
      actions: z
        .array(z.any())
        .optional()
        .describe('Photoshop ActionJSON array for applyActions operation')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job identifier'),
      status: z.string().describe('Job status'),
      statusUrl: z.string().optional().describe('URL to poll for job status'),
      manifest: z
        .any()
        .optional()
        .describe('PSD document manifest (for getManifest operation)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PhotoshopClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    let result: any;

    switch (ctx.input.operation) {
      case 'getManifest': {
        result = await client.getDocumentManifest(ctx.input.input);
        return {
          output: {
            jobId: result.jobId,
            status: result.status || 'completed',
            manifest: result.outputs?.[0]?.layers || result
          },
          message: `Retrieved PSD manifest with layer information.`
        };
      }
      case 'editLayers': {
        if (!ctx.input.output) throw new Error('Output is required for editLayers');
        result = await client.applyPsdEdits(ctx.input.input, [ctx.input.output], {
          layers: ctx.input.layers
        });
        break;
      }
      case 'editText': {
        if (!ctx.input.output) throw new Error('Output is required for editText');
        if (!ctx.input.textLayers || ctx.input.textLayers.length === 0)
          throw new Error('textLayers is required for editText');
        result = await client.editTextLayers(
          ctx.input.input,
          ctx.input.output,
          ctx.input.textLayers.map(tl => ({
            name: tl.name,
            layerId: tl.layerId,
            text: { content: tl.content }
          }))
        );
        break;
      }
      case 'replaceSmartObject': {
        if (!ctx.input.output) throw new Error('Output is required for replaceSmartObject');
        if (!ctx.input.smartObject)
          throw new Error('smartObject is required for replaceSmartObject');
        result = await client.replaceSmartObject(
          ctx.input.input,
          ctx.input.output,
          ctx.input.smartObject
        );
        break;
      }
      case 'createRendition': {
        if (!ctx.input.output) throw new Error('Output is required for createRendition');
        result = await client.createRendition(ctx.input.input, [
          {
            ...ctx.input.output,
            type: ctx.input.renditionFormat || 'jpeg',
            width: ctx.input.renditionWidth,
            quality: ctx.input.renditionQuality
          }
        ]);
        break;
      }
      case 'applyActions': {
        if (!ctx.input.output) throw new Error('Output is required for applyActions');
        if (!ctx.input.actions) throw new Error('actions is required for applyActions');
        result = await client.applyActions(
          ctx.input.input,
          ctx.input.output,
          ctx.input.actions
        );
        break;
      }
    }

    return {
      output: {
        jobId: result.jobId || result._links?.self?.href?.split('/').pop(),
        status: result.status || 'submitted',
        statusUrl: result._links?.self?.href || result.links?.self?.href
      },
      message: `PSD **${ctx.input.operation}** job submitted. Status: **${result.status || 'submitted'}**.`
    };
  })
  .build();
