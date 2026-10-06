import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSupportedConversions = SlateTool.create(spec, {
  name: 'List Supported Conversions',
  key: 'list_supported_conversions',
  description:
    'Discover current converters by source, destination, or a specific pair. With neither format, retrieve the converter inventory. Optionally include documented parameter names and requirements.',
  instructions: [
    'Use lowercase format or converter names. includeParameters returns metadata; it does not submit a conversion. Use converterSourceFormat and converterDestinationFormat for exact route names when present; sourceFormat and destinationFormat retain the file extension meanings.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .optional()
        .describe('Source file extension, such as pdf or docx'),
      destinationFormat: z
        .string()
        .optional()
        .describe('Destination extension or converter name, such as pdf or text-watermark'),
      includeParameters: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include current converter parameter metadata')
    })
  )
  .output(
    z.object({
      canConvert: z
        .boolean()
        .nullable()
        .describe('Whether the specific pair is supported; null for an inventory'),
      conversions: z.array(
        z.object({
          sourceFormat: z.string(),
          destinationFormat: z.string(),
          converterSourceFormats: z.array(z.string()).optional(),
          converterDestinationFormats: z.array(z.string()).optional(),
          converterSourceFormat: z
            .string()
            .optional()
            .describe('Native source route name when returned by converter metadata'),
          converterDestinationFormat: z
            .string()
            .optional()
            .describe(
              'Native destination route name; PDF operations can produce pdf while using routes such as protect or split'
            ),
          parameters: z
            .array(
              z.object({
                name: z.string(),
                type: z.string(),
                required: z.boolean(),
                array: z.boolean(),
                description: z.string().nullable(),
                defaultValue: z.string().nullable()
              })
            )
            .optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });
    const { sourceFormat, destinationFormat, includeParameters } = ctx.input;
    if (sourceFormat !== undefined && destinationFormat !== undefined) {
      const canConvert = await client.canConvert(sourceFormat, destinationFormat);
      const conversions = !canConvert
        ? []
        : includeParameters
          ? await client.getConverters(sourceFormat, destinationFormat, true)
          : [{ sourceFormat, destinationFormat }];
      return {
        output: { canConvert, conversions },
        message: canConvert
          ? 'The conversion pair is supported.'
          : 'The conversion pair is not supported.'
      };
    }
    const conversions = await client.getConverters(
      sourceFormat,
      destinationFormat,
      includeParameters
    );
    return {
      output: { canConvert: null, conversions },
      message: `Found ${conversions.length} supported conversion pairs.`
    };
  })
  .build();
