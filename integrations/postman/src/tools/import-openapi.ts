import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importOpenApiTool = SlateTool.create(spec, {
  name: 'Import OpenAPI Definition',
  key: 'import_openapi',
  description:
    'Import an OpenAPI definition as new Postman collections in a workspace. Returns the collection IDs and UIDs for subsequent collection, mock server, and monitor operations.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .min(1)
        .describe('Destination workspace ID. Call list_workspaces to discover IDs.'),
      definition: z
        .record(z.string(), z.any())
        .describe('Parsed OpenAPI definition as a JSON object')
    })
  )
  .output(
    z.object({
      collections: z.array(
        z.object({
          collectionId: z.string(),
          name: z.string().optional(),
          uid: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let collections = await client.importOpenApi(ctx.input.definition, ctx.input.workspaceId);
    return {
      output: {
        collections: collections.map(
          (collection: { id: string; name?: string; uid?: string }) => ({
            collectionId: collection.id,
            name: collection.name,
            uid: collection.uid
          })
        )
      },
      message: `Imported OpenAPI definition into ${collections.length} collection(s).`
    };
  })
  .build();
