import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let duplicateAutomation = SlateTool.create(spec, {
  name: 'Duplicate Automation',
  key: 'duplicate_automation',
  description: `Creates a copy of an existing DocsAutomator automation. The duplicated automation will have " COPY" appended to its title.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('The automation ID to duplicate.')
    })
  )
  .output(
    z.object({
      newAutomationId: z.string().describe('The ID of the newly created duplicate automation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.duplicateAutomation(ctx.input.automationId);

    return {
      output: {
        newAutomationId: result.newAutomationId
      },
      message: `Duplicated automation. New automation ID: **${result.newAutomationId}**.`
    };
  })
  .build();
