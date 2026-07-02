import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractStructuredData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_structured_data',
  description: `Automatically extract structured data (Schema.org, JSON-LD, Microdata, RDFa) from a web page URL. Returns machine-readable structured data found on the page without requiring manual selector configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the web page to extract structured data from.')
    })
  )
  .output(
    z.object({
      structuredData: z
        .any()
        .describe(
          'Extracted structured data from the page (Schema.org, JSON-LD, Microdata, etc.).'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.extractStructuredData(ctx.input.url);

    return {
      output: {
        structuredData: result
      },
      message: `Extracted structured data from **${ctx.input.url}**.`
    };
  })
  .build();
