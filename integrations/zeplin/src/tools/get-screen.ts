import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let getScreen = SlateTool.create(spec, {
  name: 'Get Screen',
  key: 'get_screen',
  description: `Retrieve detailed information about a specific screen in a Zeplin project, including its versions, sections, and variants.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen')
    })
  )
  .output(
    z.object({
      screenId: z.string().describe('Unique screen identifier'),
      name: z.string().describe('Screen name'),
      description: z.string().optional().describe('Screen description'),
      thumbnail: z.string().optional().describe('Screen thumbnail URL'),
      created: z.number().optional().describe('Creation timestamp'),
      updated: z.number().optional().describe('Last update timestamp'),
      tags: z.array(z.string()).optional().describe('Screen tags'),
      sections: z.array(z.any()).optional().describe('Screen sections'),
      variants: z.array(z.any()).optional().describe('Screen variants'),
      versions: z.array(z.any()).optional().describe('Screen version history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let s = (await client.getScreen(ctx.input.projectId, ctx.input.screenId)) as any;

    return {
      output: {
        screenId: s.id,
        name: s.name,
        description: s.description,
        thumbnail: s.thumbnail,
        created: s.created,
        updated: s.updated,
        tags: s.tags,
        sections: s.sections,
        variants: s.variants,
        versions: s.versions
      },
      message: `Retrieved screen **${s.name}**.`
    };
  })
  .build();
