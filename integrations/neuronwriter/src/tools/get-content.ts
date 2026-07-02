import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let getContent = SlateTool.create(spec, {
  name: 'Get Content',
  key: 'get_content',
  description: `Retrieve the last saved content revision for a query, including HTML content, title, and meta description. Optionally include autosave revisions in addition to manually saved ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      queryId: z.string().describe('Query ID to retrieve content for'),
      includeAutosave: z
        .boolean()
        .optional()
        .describe(
          'If true, includes autosave revisions in addition to manually saved ones. Defaults to false (manual only).'
        )
    })
  )
  .output(
    z.object({
      htmlContent: z.string().describe('Last saved HTML content'),
      title: z.string().describe('Content title'),
      metaDescription: z.string().describe('Meta description'),
      createdAt: z.string().describe('Revision creation timestamp'),
      revisionType: z.string().describe('Revision type (manual or autosave)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);
    let revisionType = ctx.input.includeAutosave ? 'all' : undefined;
    let result = await client.getContent(ctx.input.queryId, revisionType);

    return {
      output: {
        htmlContent: result.content,
        title: result.title,
        metaDescription: result.description,
        createdAt: result.created,
        revisionType: result.type
      },
      message: `Retrieved **${result.type}** content revision from **${result.created}**.`
    };
  })
  .build();
