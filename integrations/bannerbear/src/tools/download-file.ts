import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { nativeState, reject, uid } from '../lib/contracts';
import { deliverGeneratedFiles } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';
export const downloadFile = SlateTool.create(spec, {
  key: 'download_file',
  name: 'Download Generated File',
  description:
    'Prepare files from one exact completed V2 render or PDF operation for download. Uses the provider-issued file URLs without regenerating media or consuming new rendering quota.',
  instructions: [
    'Read pending jobs with get_resource until completed. Failed jobs have no downloadable result.',
    'Choose an available output format; no expiry or renewal policy is invented for provider file URLs.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum([
        'image',
        'video',
        'collection',
        'animated_gif',
        'movie',
        'screenshot',
        'joined_pdf',
        'rasterized_pdf'
      ]),
      resourceUid: z.string().describe('Exact UID returned by creation or discovery'),
      projectId: projectIdSchema,
      format: z
        .enum(['all', 'jpg', 'png', 'pdf', 'gif', 'mp4'])
        .optional()
        .describe('Available generated format, default all')
    })
  )
  .output(
    z.object({
      resourceUid: z.string(),
      status: z.literal('completed'),
      files: z.array(z.object({ filename: z.string(), mimeType: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    const result = await new BannerbearClient({
      ...ctx.auth,
      projectId: ctx.input.projectId
    }).getResource(ctx.input.resourceType, ctx.input.resourceUid);
    if (nativeState(result.status) !== 'completed')
      reject(
        'The exact resource is not completed. Read its native status with get_resource; do not regenerate it.'
      );
    const files = await deliverGeneratedFiles(
      ctx,
      ctx.input.resourceType,
      result,
      ctx.input.format ?? 'all'
    );
    if (!files.length)
      reject(
        'The requested format is not available for this completed resource. Choose an available format or all.'
      );
    return {
      output: {
        resourceUid: uid(result.uid),
        status: 'completed' as const,
        files: files.map(({ filename, mimeType }) => ({ filename, mimeType }))
      },
      message: 'Prepared the completed generated file(s) for download.'
    };
  })
  .build();
