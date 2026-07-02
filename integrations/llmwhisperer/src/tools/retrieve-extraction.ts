import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let retrieveExtraction = SlateTool.create(spec, {
  name: 'Retrieve Extraction',
  key: 'retrieve_extraction',
  description: `Retrieve the extracted text from a completed document extraction job. Use the whisper hash from **Extract Document** after the status is "processed".
Returns the full extracted text along with confidence and document metadata.`,
  instructions: [
    'Ensure the extraction status is "processed" before calling this tool.',
    'The extracted text can only be retrieved once — store the result if you need it again.'
  ],
  constraints: [
    'Text can only be retrieved once per extraction job. Subsequent calls will fail.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      whisperHash: z.string().describe('The whisper hash of the completed extraction job.'),
      textOnly: z
        .boolean()
        .optional()
        .describe(
          'If true, returns only the extracted text without metadata. Defaults to false.'
        )
    })
  )
  .output(
    z.object({
      resultText: z.string().describe('The extracted text content from the document.'),
      confidenceMetadata: z
        .any()
        .nullable()
        .describe('Confidence scores for extracted text lines. Null if textOnly is true.'),
      metadata: z
        .any()
        .nullable()
        .describe('Additional document metadata. Null if textOnly is true.'),
      webhookMetadata: z.string().describe('Custom metadata passed during extraction, if any.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.retrieveWhisper(ctx.input.whisperHash, ctx.input.textOnly);

    let textPreview =
      result.resultText.length > 200
        ? `${result.resultText.substring(0, 200)}...`
        : result.resultText;

    return {
      output: result,
      message: `Extracted text retrieved (${result.resultText.length} characters). Preview:\n\n\`\`\`\n${textPreview}\n\`\`\``
    };
  })
  .build();
