import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAutomation = SlateTool.create(spec, {
  name: 'Delete Automation',
  key: 'delete_automation',
  description: `Permanently deletes a DocsAutomator automation and all its settings. This action cannot be undone.`,
  constraints: [
    'This action is irreversible. The automation and all its settings will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('The automation ID to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteAutomation(ctx.input.automationId);

    return {
      output: {
        success: true
      },
      message: `Deleted automation **${ctx.input.automationId}**.`
    };
  })
  .build();
