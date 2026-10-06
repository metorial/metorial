import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { resolveSpace, spaceIdInput } from '../lib/validation';
import { spec } from '../spec';

export let listComponents = SlateTool.create(spec, {
  name: 'List Components',
  key: 'list_components',
  description: `Retrieve all content components (content type definitions) in the space. Returns the complete schema for each component, useful for understanding the content model.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ spaceId: spaceIdInput }))
  .output(
    z.object({
      components: z
        .array(
          z.object({
            componentId: z.number().optional().describe('Numeric ID of the component'),
            name: z.string().optional().describe('Technical name'),
            displayName: z.string().optional().describe('Display name'),
            isRoot: z.boolean().optional().describe('Whether this is a content type'),
            isNestable: z.boolean().optional().describe('Whether this is nestable'),
            schema: z.record(z.string(), z.unknown()).optional().describe('Field schema')
          })
        )
        .describe('List of components')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });

    let components = await client.listComponents();

    let mapped = components.map(c => ({
      componentId: c.id,
      name: c.name,
      displayName: c.display_name,
      isRoot: c.is_root,
      isNestable: c.is_nestable,
      schema: c.schema
    }));

    return {
      output: { components: mapped },
      message: `Found **${mapped.length}** components.`
    };
  })
  .build();
