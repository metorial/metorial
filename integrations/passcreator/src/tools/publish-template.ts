import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishTemplate = SlateTool.create(spec, {
  name: 'Publish Template Changes',
  key: 'publish_template',
  description: `Publish template changes to push updates to all active passes using the template. After modifying a template, this triggers an update push to all devices that have the pass saved.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Identifier of the template to publish')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Identifier of the published template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.publishTemplate(ctx.input.templateId);

    return {
      output: { templateId: ctx.input.templateId },
      message: `Published changes for template \`${ctx.input.templateId}\`. All active passes will be updated.`
    };
  })
  .build();
