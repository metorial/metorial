import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createIfsClient, projectionNameSchema } from './common';

export let exportProjectionOpenApi = SlateTool.create(spec, {
  name: 'Export Projection OpenAPI',
  key: 'export_projection_openapi',
  description:
    'Export the OpenAPI JSON document for a specific IFS projection and return it as a Slate attachment.',
  instructions: [
    'Use list_api_projections first when the projection name is unknown.',
    'Inspect the attached OpenAPI document to identify entity sets and fields before using query_projection_records.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectionName: projectionNameSchema,
      openApiVersion: z
        .enum(['v3', 'v2'])
        .optional()
        .describe('OpenAPI format to export. Defaults to v3.')
    })
  )
  .output(
    z.object({
      projectionName: z.string(),
      openApiVersion: z.enum(['v3', 'v2']),
      mimeType: z.string(),
      byteLength: z.number(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let openApiVersion = ctx.input.openApiVersion ?? 'v3';
    let client = createIfsClient(ctx);
    let result = await client.exportProjectionOpenApi({
      projectionName: ctx.input.projectionName,
      openApiVersion
    });

    return {
      output: {
        projectionName: ctx.input.projectionName,
        openApiVersion,
        mimeType: result.mimeType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      message: `Exported OpenAPI ${openApiVersion.toUpperCase()} for **${ctx.input.projectionName}**.`,
      attachments: [createTextAttachment(result.content, result.mimeType)]
    };
  })
  .build();
