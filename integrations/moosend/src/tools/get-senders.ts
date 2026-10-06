import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { email, identifier, optionalBoolean, optionalText, text } from '../lib/data';
import { spec } from '../spec';

export const getSenders = SlateTool.create(spec, {
  key: 'get_senders',
  name: 'Get Senders',
  description:
    'Discover campaign senders and their enabled, verification and domain-authentication status, or look up one sender by email. This is sender configuration, not current-user identity.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      email: z
        .string()
        .optional()
        .describe('Sender email to look up; omit to list enabled campaign senders')
    })
  )
  .output(
    z.object({
      senders: z.array(
        z.object({
          senderId: z.string(),
          email: z.string(),
          name: z.string().optional(),
          createdOn: z.string().optional(),
          enabled: z.boolean().optional(),
          verified: z.boolean().optional(),
          spfVerified: z.boolean().optional(),
          dkimVerified: z.boolean().optional(),
          dmarcVerified: z.boolean().optional()
        })
      ),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const client = new MoosendClient({ token: ctx.auth.token });
    const sender =
      ctx.input.email === undefined
        ? undefined
        : await client.getSenderByEmail(email(ctx.input.email));
    const values =
      ctx.input.email === undefined
        ? await client.getSenders()
        : sender === null
          ? []
          : [sender!];
    const senders = values.map(value => ({
      senderId: identifier(value.ID),
      email: text(value.Email, 'sender email'),
      name: optionalText(value.Name),
      createdOn: optionalText(value.CreatedOn),
      enabled: optionalBoolean(value.IsEnabled),
      verified: optionalBoolean(value.IsVerified),
      spfVerified: optionalBoolean(value.SpfVerified),
      dkimVerified: optionalBoolean(value.DkimVerified),
      dmarcVerified: optionalBoolean(value.DmarcVerified)
    }));
    return {
      output: { senders, returnedCount: senders.length },
      message: `Retrieved ${senders.length} campaign sender(s).`
    };
  })
  .build();
