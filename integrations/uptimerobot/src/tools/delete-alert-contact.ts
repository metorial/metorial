import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAlertContact = SlateTool.create(spec, {
  name: 'Delete Alert Contact',
  key: 'delete_alert_contact',
  description: `Use a Legacy API Key connection (API v2). Permanently delete an alert contact. The contact will no longer receive notifications for any monitors it was assigned to.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the alert contact to delete')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the deleted alert contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.deleteAlertContact(ctx.input.contactId);

    return {
      output: {
        contactId: String(result.id)
      },
      message: `Deleted alert contact **${ctx.input.contactId}**.`
    };
  })
  .build();
