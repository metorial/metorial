import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a Chameleon company by its Chameleon ID or external UID.
Optionally cascade the deletion to remove all associated user profiles.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: z.string().optional().describe('Chameleon company ID'),
      uid: z.string().optional().describe('External company identifier'),
      cascade: z
        .boolean()
        .optional()
        .describe('If true, also deletes all user profiles associated with this company')
    })
  )
  .output(
    z.object({
      deletionId: z.string().optional().describe('ID of the deletion record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);
    let result = await client.deleteCompany({
      companyId: ctx.input.companyId,
      uid: ctx.input.uid,
      cascade: ctx.input.cascade
    });
    return {
      output: { deletionId: result.id },
      message: `Company **${ctx.input.companyId || ctx.input.uid}** has been deleted${ctx.input.cascade ? ' along with associated profiles' : ''}.`
    };
  })
  .build();
