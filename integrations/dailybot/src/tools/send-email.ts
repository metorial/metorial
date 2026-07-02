import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let sendEmail = SlateTool.create(spec, {
  name: 'Send Email',
  key: 'send_email',
  description: `Send an email to one or more users in the organization via DailyBot.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userUuids: z.array(z.string()).describe('UUIDs of users to send the email to'),
      subject: z.string().describe('Email subject line'),
      content: z.string().describe('Email body content')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    await client.sendEmail({
      usersUuids: ctx.input.userUuids,
      emailSubject: ctx.input.subject,
      emailContent: ctx.input.content
    });

    return {
      output: { sent: true },
      message: `Email sent to **${ctx.input.userUuids.length}** user(s).`
    };
  })
  .build();
