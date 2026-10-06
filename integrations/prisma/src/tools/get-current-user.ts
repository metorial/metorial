import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { principalResponse } from '../lib/schemas';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Identify the authenticated Prisma user, workspace, and credential type. Service tokens may have a workspace without a user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(principalResponse)
  .handleInvocation(async ctx => {
    const principal = await new PrismaClient(ctx.auth.token).getCurrentUser();
    return {
      output: principal,
      message: `Authenticated as **${principal.user?.name ?? principal.user?.email ?? principal.workspace?.name ?? principal.credential.type}**.`
    };
  })
  .build();
