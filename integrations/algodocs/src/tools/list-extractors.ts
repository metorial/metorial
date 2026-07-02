import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listExtractors = SlateTool.create(spec, {
  name: 'List Extractors',
  key: 'list_extractors',
  description: `Lists all extractors configured in your Algodocs account. Each extractor defines rules for extracting specific fields and tables from documents. Use this to discover available extractors and obtain their IDs for uploading documents or retrieving extracted data.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      extractors: z
        .array(
          z.object({
            extractorId: z.string().describe('Unique identifier of the extractor'),
            name: z.string().describe('Name of the extractor')
          })
        )
        .describe('List of extractors in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let extractors = await client.getExtractors();

    let mapped = extractors.map(e => ({
      extractorId: e.id,
      name: e.name
    }));

    return {
      output: { extractors: mapped },
      message: `Found **${mapped.length}** extractor(s).\n\n${mapped.map(e => `- **${e.name}** (\`${e.extractorId}\`)`).join('\n')}`
    };
  })
  .build();
