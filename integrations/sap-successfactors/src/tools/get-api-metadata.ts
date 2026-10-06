import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
export let getApiMetadata = SlateTool.create(spec, {
  key: 'get_api_metadata',
  name: 'Get API Metadata',
  description:
    'Discover OData V2 entity sets, exact keys, scalar field types, navigation names and advertised operations for this company, with a downloadable metadata XML file. Metadata availability does not prove data permissions or module access.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      entitySet: z
        .string()
        .optional()
        .describe('Exact entity set to inspect. Omit to discover all exposed entities.'),
      includeProperties: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Include field and navigation definitions in the structured summary. The download always contains the provider metadata.'
        )
    })
  )
  .output(
    z.object({
      fileName: z.string(),
      mimeType: z.string(),
      entities: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          keys: z.array(z.string()),
          creatable: z.boolean(),
          updatable: z.boolean(),
          upsertable: z.boolean(),
          deletable: z.boolean(),
          properties: z
            .array(
              z.object({
                name: z.string(),
                type: z.string(),
                nullable: z.boolean(),
                required: z.boolean(),
                creatable: z.boolean(),
                updatable: z.boolean(),
                visible: z.boolean()
              })
            )
            .optional(),
          navigationProperties: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getMetadata(ctx.input.entitySet);
    await ctx.addAttachment({
      type: 'url',
      url: result.url,
      mimeType: 'application/atom+xml',
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    let entities = result.entities.map(({ properties, navigationProperties, ...entity }) => ({
      ...entity,
      ...(ctx.input.includeProperties ? { properties, navigationProperties } : {})
    }));
    return {
      output: {
        fileName: 'successfactors-metadata.xml',
        mimeType: 'application/atom+xml',
        entities
      },
      message: `Discovered ${entities.length} entity sets and prepared the metadata file for download.`
    };
  })
  .build();
