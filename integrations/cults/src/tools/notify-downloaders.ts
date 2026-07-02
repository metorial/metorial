import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let notifyDownloaders = SlateTool.create(spec, {
  name: 'Notify Downloaders',
  key: 'notify_downloaders',
  description: `Send a change notification to all users who previously downloaded one of your creations. Useful for announcing updates, fixes, or new versions of a design.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      creationId: z.string().describe('ID of the creation to notify about'),
      text: z.string().describe('Notification message text')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the notification was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.createChangeNotification({
      creationId: ctx.input.creationId,
      text: ctx.input.text
    });

    return {
      output: {
        sent: true
      },
      message: `Notification sent to all downloaders of creation ${ctx.input.creationId}.`
    };
  })
  .build();
