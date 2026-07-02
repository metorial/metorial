import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtractedData = SlateTool.create(spec, {
  name: 'Get Extracted Data',
  key: 'get_extracted_data',
  description: `Retrieve the AI-extracted data from a processed document in simplified JSON format. Returns structured key-value pairs organized by sections (e.g., "Basic Information", "Line Items") along with document metadata. The document must have completed processing before data can be retrieved.`,
  instructions: [
    'If the API returns a 202 status, the document is still processing. Wait and retry later.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z
        .string()
        .describe('Unique identifier of the document to retrieve extracted data from')
    })
  )
  .output(
    z.object({
      sections: z
        .record(z.string(), z.any())
        .describe(
          'Extracted data organized by sections (e.g., "Basic Information", "Buyer Detail", "Line Items")'
        ),
      metaData: z
        .record(z.string(), z.any())
        .describe(
          'Document metadata including status, title, type, and processing information'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getExtractedData(ctx.input.docId);

    let sectionNames = Object.keys(result.sections);

    return {
      output: result,
      message: `Retrieved extracted data for document **${ctx.input.docId}**. Sections: ${sectionNames.length > 0 ? sectionNames.join(', ') : 'none'}.`
    };
  })
  .build();
