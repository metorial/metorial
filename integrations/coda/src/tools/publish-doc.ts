import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishDocTool = SlateTool.create(spec, {
  name: 'Publish Doc',
  key: 'publish_doc',
  description: `Publish a Coda doc or update its publishing settings, including slug, discoverability, interaction mode, and category assignments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc to publish'),
      slug: z.string().optional().describe('URL slug for the published doc'),
      discoverable: z.boolean().optional().describe('Whether the doc appears in the gallery'),
      mode: z
        .enum(['view', 'play', 'edit'])
        .optional()
        .describe('Interaction mode for published doc'),
      categoryNames: z
        .array(z.string())
        .optional()
        .describe('Categories to assign to the published doc')
    })
  )
  .output(
    z.object({
      published: z.boolean().describe('Whether the doc was published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.publishDoc(ctx.input.docId, {
      slug: ctx.input.slug,
      discoverable: ctx.input.discoverable,
      mode: ctx.input.mode,
      categoryNames: ctx.input.categoryNames
    });

    return {
      output: {
        published: true
      },
      message: `Published doc **${ctx.input.docId}**.`
    };
  })
  .build();

export let unpublishDocTool = SlateTool.create(spec, {
  name: 'Unpublish Doc',
  key: 'unpublish_doc',
  description: `Unpublish a previously published Coda doc, removing it from public access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc to unpublish')
    })
  )
  .output(
    z.object({
      unpublished: z.boolean().describe('Whether the doc was unpublished')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.unpublishDoc(ctx.input.docId);

    return {
      output: {
        unpublished: true
      },
      message: `Unpublished doc **${ctx.input.docId}**.`
    };
  })
  .build();
