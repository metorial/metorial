import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve the current Kit account information including the creator's name, email, and profile details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Unique account ID'),
      name: z.string().describe('Account holder name'),
      emailAddress: z.string().describe('Account email address'),
      profileImageUrl: z.string().optional().describe('URL of the profile image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getAccount();
    let user = data.user;

    return {
      output: {
        accountId: user.id,
        name: user.name,
        emailAddress: user.email_address,
        profileImageUrl: user.profile_image?.url
      },
      message: `Retrieved account info for **${user.name}** (${user.email_address}).`
    };
  })
  .build();
