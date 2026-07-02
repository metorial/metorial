import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSupportedConversions = SlateTool.create(spec, {
  name: 'List Supported Conversions',
  key: 'list_supported_conversions',
  description: `Discover available file format conversions. Query by source format, destination format, or check if a specific conversion pair is supported.
Use this to dynamically determine what conversions are available before performing them.`,
  instructions: [
    'Provide either sourceFormat or destinationFormat (or both to check a specific pair).',
    'Format names are lowercase file extensions (e.g., "pdf", "docx", "jpg").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .optional()
        .describe('List all formats this source can convert to (e.g., "pdf", "docx")'),
      destinationFormat: z
        .string()
        .optional()
        .describe('List all formats that can convert to this destination (e.g., "pdf", "jpg")')
    })
  )
  .output(
    z.object({
      canConvert: z
        .boolean()
        .nullable()
        .describe(
          'Whether the specific source→destination conversion is supported (when both formats provided)'
        ),
      conversions: z
        .array(
          z.object({
            sourceFormat: z.string().describe('Source file format'),
            destinationFormat: z.string().describe('Destination file format')
          })
        )
        .describe('List of supported conversion pairs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.sourceFormat && ctx.input.destinationFormat) {
      let supported = await client.canConvert(
        ctx.input.sourceFormat,
        ctx.input.destinationFormat
      );
      return {
        output: {
          canConvert: supported,
          conversions: supported
            ? [
                {
                  sourceFormat: ctx.input.sourceFormat,
                  destinationFormat: ctx.input.destinationFormat
                }
              ]
            : []
        },
        message: supported
          ? `✅ Conversion **${ctx.input.sourceFormat}** → **${ctx.input.destinationFormat}** is supported.`
          : `❌ Conversion **${ctx.input.sourceFormat}** → **${ctx.input.destinationFormat}** is not supported.`
      };
    }

    let conversions: Array<{ sourceFormat: string; destinationFormat: string }> = [];

    if (ctx.input.sourceFormat) {
      conversions = await client.getConvertersForSource(ctx.input.sourceFormat);
    } else if (ctx.input.destinationFormat) {
      conversions = await client.getConvertersForDestination(ctx.input.destinationFormat);
    }

    let direction = ctx.input.sourceFormat
      ? `from **${ctx.input.sourceFormat}**`
      : `to **${ctx.input.destinationFormat}**`;

    return {
      output: {
        canConvert: null,
        conversions
      },
      message: `Found **${conversions.length}** supported conversion(s) ${direction}.`
    };
  })
  .build();
