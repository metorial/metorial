import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { integer } from '../lib/contracts';
import { listTypeSchema, projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';
export const listResources = SlateTool.create(spec, {
  key: 'list_resources',
  name: 'List Resources',
  description:
    'Discover V2 generated resources, template sets, video templates, editor sessions or signed bases on one numbered page. Master V2 keys can discover authorized projects.',
  instructions: [
    'The API returns 25 items per page by default. Continue numbered pages until an empty page; no stable snapshot or total count is provided.',
    'limit applies only to images or templates. Signed bases require their exact templateUid. Project discovery requires a Master key and does not accept projectId.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: listTypeSchema,
      projectId: projectIdSchema,
      page: z.number().optional().describe('Positive integer page, default 1'),
      limit: z
        .number()
        .optional()
        .describe('Images or templates only: positive integer up to 100, default 25'),
      templateUid: z
        .string()
        .optional()
        .describe('Required exact parent template UID for signed_base only'),
      tag: z.string().optional().describe('Template tag filter only'),
      name: z.string().optional().describe('Template name filter only')
    })
  )
  .output(
    z.object({
      resourceType: listTypeSchema,
      page: z.number(),
      resources: z.array(z.record(z.string(), z.unknown()))
    })
  )
  .handleInvocation(async ctx => {
    const resources = await new BannerbearClient({
      ...ctx.auth,
      projectId: ctx.input.projectId
    }).listResources(ctx.input.resourceType, {
      page: ctx.input.page,
      limit: ctx.input.limit,
      templateUid: ctx.input.templateUid,
      tag: ctx.input.tag,
      name: ctx.input.name
    });
    return {
      output: {
        resourceType: ctx.input.resourceType,
        page: integer(ctx.input.page ?? 1),
        resources
      },
      message: `Returned ${resources.length} resource(s) on this numbered page. An empty page ends the current traversal; resources may change between requests.`
    };
  })
  .build();
