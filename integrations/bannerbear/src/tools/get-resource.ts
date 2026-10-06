import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { optionalText, uid } from '../lib/contracts';
import { deliverGeneratedFiles } from '../lib/results';
import { projectIdSchema, resourceTypeSchema } from '../lib/schemas';
import { spec } from '../spec';
export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Retrieve an exact V2 resource, including asynchronous rendering state, native details and completed downloadable files. Discover UIDs with list_resources.',
  instructions: [
    'Use the UID returned by creation or discovery. Poll pending jobs instead of repeating creation; failed jobs are returned as failed.',
    'Project lookup requires a Master V2 API key. Standard resource lookup with a Full Access Master key requires a discovered projectId.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: resourceTypeSchema.describe('Exact V2 resource kind'),
      resourceUid: z
        .string()
        .describe('Exact UID for this resource kind, from creation or list_resources'),
      projectId: projectIdSchema
    })
  )
  .output(
    z.object({
      resourceType: resourceTypeSchema,
      resourceUid: z.string(),
      status: z.string().optional(),
      resource: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    const resource = await new BannerbearClient({
      ...ctx.auth,
      projectId: ctx.input.projectId
    }).getResource(ctx.input.resourceType, ctx.input.resourceUid);
    await deliverGeneratedFiles(ctx, ctx.input.resourceType, resource);
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceUid: uid(resource.uid),
        status: optionalText(resource.status),
        resource
      },
      message: 'Retrieved the exact resource and its current native state.'
    };
  })
  .build();
