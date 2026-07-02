import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let archiveTemplate = SlateTool.create(spec, {
  name: 'Archive Template',
  key: 'archive_template',
  description: `Archive a document template, removing it from active use while preserving its submission history.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to archive')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Archived template ID'),
      archivedAt: z.string().describe('Archive timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.archiveTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: result.id,
        archivedAt: result.archived_at
      },
      message: `Archived template ID **${result.id}**.`
    };
  })
  .build();
