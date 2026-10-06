import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { nonempty, optionalText, rows } from '../lib/contracts';
import { templateOutput } from '../lib/results';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific Bannerbear template, including its available modifications (layers and their types). Useful for discovering which layer names to use when generating images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      templateUid: z.string().describe('UID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateUid: z.string().describe('UID of the template'),
      name: z.string().describe('Template name'),
      width: z.number().describe('Template width in pixels'),
      height: z.number().describe('Template height in pixels'),
      previewUrl: z.string().nullable().describe('Preview image URL'),
      tags: z.array(z.string()).describe('Template tags'),
      availableModifications: z
        .array(
          z.object({
            name: z.string().describe('Layer name used in modifications'),
            type: z.string().optional().describe('Layer type (e.g. text, image, shape)')
          })
        )
        .describe('Available layers that can be modified'),
      createdAt: z.string().describe('Timestamp when the template was created')
    })
  )
  .handleInvocation(async ctx => {
    const client = new BannerbearClient({ ...ctx.auth, projectId: ctx.input.projectId });
    const result = await client.getTemplate(ctx.input.templateUid);
    const availableModifications = rows(result.available_modifications).map(item => ({
      name: nonempty(item.name),
      type: optionalText(item.type)
    }));
    return {
      output: {
        ...templateOutput(result),
        availableModifications,
        createdAt: nonempty(result.created_at)
      },
      message: `Retrieved the exact template and ${availableModifications.length} modifiable layer(s).`
    };
  })
  .build();
