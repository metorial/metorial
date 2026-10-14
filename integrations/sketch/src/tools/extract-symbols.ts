import { SlateTool } from 'slates';
import { z } from 'zod';
import { collectAllSymbols } from '../lib/client';
import { parseSketchPages } from '../lib/schemas';
import { spec } from '../spec';

export let extractSymbolsTool = SlateTool.create(spec, {
  name: 'Extract Symbols',
  key: 'extract_symbols',
  description:
    'Extract reusable symbol sources from unpacked Sketch page JSON. Returns each symbol ID, object ID, name, containing page, and dimensions for design-system inventories and symbol-instance lookup.',
  instructions: [
    'Provide page JSON objects from the pages/ folder of a .sketch archive. This lists local symbol sources, not remote library contents.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      pages: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Page JSON objects from the pages/ folder of a .sketch archive')
    })
  )
  .output(
    z.object({
      symbolCount: z.number().describe('Number of local symbol sources'),
      symbols: z.array(
        z.object({
          symbolId: z.string().describe('Symbol ID referenced by symbol instances'),
          objectId: z.string().describe('Object ID of the symbol source layer'),
          name: z.string().describe('Symbol source name'),
          pageName: z.string().describe('Page containing the symbol source'),
          width: z.number().describe('Width in points'),
          height: z.number().describe('Height in points')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let symbols = collectAllSymbols(parseSketchPages(ctx.input.pages));
    return {
      output: { symbolCount: symbols.length, symbols },
      message: `Found **${symbols.length}** local symbol source(s).`
    };
  })
  .build();
