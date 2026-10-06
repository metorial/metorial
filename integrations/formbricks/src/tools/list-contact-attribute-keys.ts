import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export const listContactAttributeKeys = SlateTool.create(spec, {
  name: 'List Contact Attribute Keys',
  key: 'list_contact_attribute_keys',
  description:
    'Discover current native contact attribute keys and their workspace, uniqueness, type, and timestamps.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      attributeKeys: z.array(
        z.object({
          attributeKeyId: z.string(),
          key: z.string(),
          name: z.string().nullable(),
          type: z.string(),
          description: z.string().optional(),
          isUnique: z.boolean(),
          workspaceId: z.string().optional(),
          environmentId: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const values = await new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      instanceUrl: ctx.auth.instanceUrl
    }).listContactAttributeKeys();
    return {
      output: {
        attributeKeys: values.map(value => ({
          attributeKeyId: value.id,
          key: value.key,
          name: value.name,
          type: value.type,
          description: value.description ?? undefined,
          isUnique: value.isUnique,
          workspaceId: value.workspaceId,
          environmentId: value.environmentId,
          createdAt: value.createdAt,
          updatedAt: value.updatedAt
        }))
      },
      message: `Found ${values.length} contact attribute keys.`
    };
  })
  .build();
