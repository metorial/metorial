import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';
export const getEnvironmentContext = SlateTool.create(spec, {
  key: 'get_environment_context',
  name: 'Get Environment Context',
  description:
    'Read connected Cloudinary product-environment settings and folder mode. The configured cloud name and region are routing settings, rather than a verified person identity.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      configuredCloudName: z.string(),
      cloudName: z
        .string()
        .optional()
        .describe('Product-environment name, only when returned by the provider.'),
      folderMode: z.enum(['fixed', 'dynamic']).optional(),
      region: z.enum(['us', 'eu', 'ap'])
    })
  )
  .handleInvocation(async ctx => ({
    output: await createClient(ctx).getEnvironmentContext(),
    message: 'Retrieved the connected product-environment settings.'
  }))
  .build();
