import { SlateTool } from 'slates';
import { z } from 'zod';
import { collectTextContent, type SketchPage } from '../lib/client';
import { spec } from '../spec';

export let extractTextContentTool = SlateTool.create(spec, {
  name: 'Extract Text Content',
  key: 'extract_text_content',
  description: `Extract all text content from text layers in a Sketch document. Returns the string content of every text layer along with the layer name and page it belongs to.

Use this for content auditing, localization workflows, copy extraction, or checking text across a design for consistency or typos.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pages: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of page JSON objects from the pages/ folder in the .sketch archive')
    })
  )
  .output(
    z.object({
      textLayerCount: z.number().describe('Total number of text layers found'),
      textEntries: z
        .array(
          z.object({
            objectId: z.string().describe('Unique object ID of the text layer'),
            layerName: z.string().describe('Name of the text layer'),
            textContent: z.string().describe('The string content of the text layer'),
            pageName: z.string().describe('Name of the page containing this text layer')
          })
        )
        .describe('All text content entries')
    })
  )
  .handleInvocation(async ctx => {
    let pages = ctx.input.pages as SketchPage[];
    let textEntries = collectTextContent(pages);

    return {
      output: {
        textLayerCount: textEntries.length,
        textEntries
      },
      message: `Extracted text from **${textEntries.length}** text layer(s).`
    };
  })
  .build();
