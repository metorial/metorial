import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { verificationListIdSchema, verificationListSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getVerificationList = SlateTool.create(spec, {
  name: 'Get Verification List',
  key: 'get_verification_list',
  description:
    'Retrieve a verification list by its ID from list_verification_lists or verify_email_batch. Poll until the provider status is COMPLETED before using download_list_results. The provider returns an array of matching records.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ listId: verificationListIdSchema }))
  .output(z.object({ lists: z.array(verificationListSchema) }))
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({ token: ctx.auth.token });
    let lists = await client.getVerificationList(ctx.input.listId);
    return {
      output: { lists },
      message: `Retrieved **${lists.length}** record(s) for verification list **${ctx.input.listId}**.`
    };
  })
  .build();
