import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeuronWriterClient } from '../lib/client';
import { spec } from '../spec';

export let exportContent = SlateTool.create(spec, {
  name: 'Export Content',
  key: 'export_content',
  description:
    'Download the latest saved query content as an HTML file, with revision details and article metadata. Useful for handing a draft to an editor or importing it into a publishing workflow.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      queryId: z.string().describe('Query ID whose content should be exported'),
      includeAutosave: z
        .boolean()
        .optional()
        .describe(
          'Include autosave revisions when finding the latest revision; defaults to false'
        )
    })
  )
  .output(
    z.object({
      queryId: z.string().describe('Query identifier'),
      filename: z.string().describe('HTML file name'),
      mimeType: z.string().describe('File MIME type'),
      title: z.string().describe('Article title'),
      metaDescription: z.string().describe('Article meta description'),
      createdAt: z.string().describe('Revision creation timestamp'),
      revisionType: z.string().describe('Revision type (manual or autosave)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeuronWriterClient(ctx.auth.token);
    let result = await client.getContent(
      ctx.input.queryId,
      ctx.input.includeAutosave ? 'all' : undefined
    );
    let filename = 'neuronwriter-content.html';
    let mimeType = 'text/html';

    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.content, {
        headers: { 'Content-Type': `${mimeType}; charset=utf-8` }
      }),
      filename
    });

    return {
      output: {
        queryId: ctx.input.queryId,
        filename,
        mimeType,
        title: result.title,
        metaDescription: result.description,
        createdAt: result.created,
        revisionType: result.type
      },
      message: `Prepared the **${result.type}** content revision from **${result.created}** as an HTML file for download.`
    };
  })
  .build();
