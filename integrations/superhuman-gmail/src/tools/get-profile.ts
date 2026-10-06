import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GMAIL_COMPOSE, GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ } from '../auth';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getProfile = SlateTool.create(spec, {
  key: 'get_profile',
  name: 'Get Gmail Profile',
  description:
    'Identify the selected Gmail mailbox and read its message count, conversation count and current history ID.',
  instructions: [
    'The default mailbox is the authenticated user. Selecting another address does not grant access to it.'
  ],
  tags: { readOnly: true }
})
  .scopes(anyOf(GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ, GMAIL_COMPOSE))
  .input(z.object({}))
  .output(
    z.object({
      emailAddress: z.string(),
      messagesTotal: z.number(),
      threadsTotal: z.number(),
      historyId: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: await new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    }).getProfile(),
    message: 'Retrieved the selected Gmail mailbox profile.'
  }));
