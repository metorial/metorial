import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let removeUserFromCompanyTool = SlateTool.create(spec, {
  name: 'Remove User from Company',
  key: 'remove_user_from_company',
  description:
    'Remove a user from a company. Their votes will no longer count toward the company’s spend.',
  tags: { destructive: true }
})
  .input(
    z.object({
      cannyUserId: z
        .string()
        .describe('Canny-internal user ID from retrieve_user or list_users'),
      companyId: z
        .string()
        .describe('Company ID used when associating the user with the company')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the user was removed'),
      cannyUserId: z.string().describe('User ID'),
      companyId: z.string().describe('Company ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.removeUserFromCompany(
      ctx.input.cannyUserId,
      ctx.input.companyId
    );
    if (result !== 'success') {
      throw createApiServiceError(
        'Canny did not confirm that the user was removed from the company.'
      );
    }
    return {
      output: {
        success: true,
        cannyUserId: ctx.input.cannyUserId,
        companyId: ctx.input.companyId
      },
      message: `Removed user **${ctx.input.cannyUserId}** from company **${ctx.input.companyId}**.`
    };
  })
  .build();
