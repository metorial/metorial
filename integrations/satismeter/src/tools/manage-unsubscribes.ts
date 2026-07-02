import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let getUnsubscribesTool = SlateTool.create(spec, {
  name: 'Get Unsubscribed Emails',
  key: 'get_unsubscribed_emails',
  description: `Retrieve the list of email addresses that have been unsubscribed from surveys for the project.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      emails: z.array(z.string()).describe('List of unsubscribed email addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    let result = await client.getUnsubscribedEmails(ctx.config.projectId);

    let emails: string[] = result?.data?.attributes?.emails || [];

    return {
      output: { emails },
      message: `Found **${emails.length}** unsubscribed email(s).`
    };
  })
  .build();

export let updateUnsubscribesTool = SlateTool.create(spec, {
  name: 'Update Unsubscribed Emails',
  key: 'update_unsubscribed_emails',
  description: `Update the list of unsubscribed email addresses for the project. The provided list replaces the existing unsubscribe list entirely. Use **Get Unsubscribed Emails** first to retrieve the current list, then add or remove emails as needed before updating.`,
  instructions: [
    'This replaces the full unsubscribe list. Retrieve the current list first to avoid accidentally removing existing entries.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      emails: z.array(z.string()).describe('Complete list of email addresses to unsubscribe')
    })
  )
  .output(
    z.object({
      emails: z.array(z.string()).describe('The updated list of unsubscribed email addresses'),
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    await client.updateUnsubscribedEmails(ctx.config.projectId, ctx.input.emails);

    return {
      output: { emails: ctx.input.emails, success: true },
      message: `Updated unsubscribe list with **${ctx.input.emails.length}** email(s).`
    };
  })
  .build();
