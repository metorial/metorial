import { SlateTool } from 'slates';
import { z } from 'zod';
import { ReferralRockClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  firstName: z.string().describe('Contact first name'),
  lastName: z.string().optional().describe('Contact last name'),
  email: z.string().describe('Contact email address'),
  contactType: z.string().optional().describe('Contact type identifier')
});

export let sendInviteFeed = SlateTool.create(spec, {
  name: 'Send Invite Feed',
  key: 'send_invite_feed',
  description: `Send one or more contacts to be used with the automatic invite feature. Contacts will be added to the invite list for referral campaigns, enabling programmatic population of invite lists.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contacts: z
        .array(contactSchema)
        .min(1)
        .describe('List of contacts to add to the invite feed')
    })
  )
  .output(
    z.object({
      contactCount: z.number().describe('Number of contacts submitted'),
      success: z.boolean().describe('Whether the contacts were submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ReferralRockClient({ token: ctx.auth.token });

    if (ctx.input.contacts.length === 1) {
      await client.sendInviteFeedSingle(ctx.input.contacts[0]!);
    } else {
      await client.sendInviteFeedBatch(ctx.input.contacts);
    }

    return {
      output: {
        contactCount: ctx.input.contacts.length,
        success: true
      },
      message: `Submitted **${ctx.input.contacts.length}** contact(s) to the invite feed.`
    };
  })
  .build();
