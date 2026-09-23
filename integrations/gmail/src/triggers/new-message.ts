import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';
import { messagesGroup, newMessageSchema } from './messages-group';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description: 'Triggers for Gmail messages dated within the past hour.',
  constraints: [
    'Polling checks a one-hour window. Messages deleted before the next poll, polling delays longer than an hour, and imports with historical dates may cause missed events.'
  ]
})
  .scopes(gmailActionScopes.newMessage)
  .triggerGroup(messagesGroup)
  .input(newMessageSchema)
  .output(
    z.object({
      messageId: z.string().describe('ID of the message.'),
      threadId: z.string().describe('Thread ID.'),
      labelIds: z.array(z.string()).describe('Current labels on the message.'),
      internalDate: z.string().describe('Gmail creation time in epoch milliseconds.'),
      from: z.string().optional().describe('Sender.'),
      to: z.string().optional().describe('Recipients.'),
      subject: z.string().optional().describe('Subject.'),
      snippet: z.string().optional().describe('Message snippet.'),
      date: z.string().optional().describe('Date header.')
    })
  )
  .matches(payload => newMessageSchema.safeParse(payload).success)
  .map(async ctx => ({
    type: 'message.added',
    id: ctx.input.messageId,
    output: ctx.input
  }))
  .build();
