import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, publicContact } from '../lib/client';
import { spec } from '../spec';
export const getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description:
    'Read one contact by its exact ID. Attributes and user identifiers appear only when returned by the provider.',
  tags: { readOnly: true }
})
  .input(z.object({ contactId: z.string().describe('Exact contact ID') }))
  .output(
    z.object({
      contactId: z.string(),
      workspaceId: z.string().optional(),
      environmentId: z.string().optional(),
      userId: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: publicContact(
      await new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl,
        instanceUrl: ctx.auth.instanceUrl
      }).getContact(ctx.input.contactId)
    ),
    message: 'Retrieved the exact contact.'
  }))
  .build();
