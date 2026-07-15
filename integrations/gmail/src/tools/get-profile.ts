import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description:
    "Get the authenticated user's Gmail mailbox profile, including mailbox totals and the current history ID.",
  tags: {
    readOnly: true
  }
})
  .scopes(gmailActionScopes.getProfile)
  .input(z.object({}))
  .output(
    z.object({
      emailAddress: z.string().describe('Email address of the Gmail mailbox.'),
      messagesTotal: z.number().describe('Total number of messages in the mailbox.'),
      threadsTotal: z.number().describe('Total number of threads in the mailbox.'),
      historyId: z.string().describe("ID of the mailbox's current history record.")
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });
    let profile = await client.getProfile();

    return {
      output: profile,
      message: `Retrieved Gmail profile for **${profile.emailAddress}**.`
    };
  });
