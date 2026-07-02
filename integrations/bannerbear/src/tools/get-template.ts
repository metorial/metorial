import { SlateTool } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
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
    let client = new BannerbearClient({ token: ctx.auth.token });

    let result = await client.getTemplate(ctx.input.templateUid);

    let availableModifications = (result.available_modifications || []).map((m: any) => ({
      name: m.name,
      type: m.type
    }));

    return {
      output: {
        templateUid: result.uid,
        name: result.name,
        width: result.width,
        height: result.height,
        previewUrl: result.preview_url || null,
        tags: result.tags || [],
        availableModifications,
        createdAt: result.created_at
      },
      message: `Template **${result.name}** (${result.width}x${result.height}) has ${availableModifications.length} modifiable layer(s).`
    };
  })
  .build();
