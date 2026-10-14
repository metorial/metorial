import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the Hyperise account connected by the API token. Returns the user ID, name, email, and image service domain.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z
      .object({
        userId: z.string().describe('ID of the connected Hyperise user'),
        name: z.string().optional().describe('User name'),
        email: z.string().optional().describe('User email address'),
        photoUrl: z.string().optional().describe('User profile photo URL'),
        imageServiceDomain: z
          .string()
          .optional()
          .describe('Base domain for personalized image URLs'),
        appUrl: z.string().optional().describe('Hyperise application URL'),
        createdAt: z.string().optional().describe('Account creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCurrentUser();
    let user = result?.data ?? result;
    if (
      !isApiErrorRecord(user) ||
      (typeof user.id !== 'string' && typeof user.id !== 'number')
    ) {
      throw createApiServiceError('Hyperise returned an account profile without a user ID.');
    }

    return {
      output: {
        ...user,
        userId: String(user.id),
        name: typeof user.name === 'string' ? user.name : undefined,
        email: typeof user.email === 'string' ? user.email : undefined,
        photoUrl: typeof user.photo_url === 'string' ? user.photo_url : undefined,
        imageServiceDomain:
          typeof user.image_service_domain === 'string'
            ? user.image_service_domain
            : undefined,
        appUrl: typeof user.app_url === 'string' ? user.app_url : undefined,
        createdAt: typeof user.created_at === 'string' ? user.created_at : undefined
      },
      message: `Connected to Hyperise as **${user.name || user.email || user.id}**.`
    };
  })
  .build();
