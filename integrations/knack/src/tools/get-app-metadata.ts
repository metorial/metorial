import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { array, KnackClient, resolveApplicationId, text } from '../lib/client';
import { spec } from '../spec';

export let getAppMetadata = SlateTool.create(spec, {
  name: 'Get App Metadata',
  key: 'get_app_metadata',
  description: `Retrieve the full metadata for your Knack application, including all objects (tables), their fields, scenes (pages), and views. Useful for discovering the data structure, field keys, and object keys needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectKey: z
        .string()
        .optional()
        .describe(
          'Return only this object in the objects summary; omit to discover all objects'
        ),
      sceneKey: z
        .string()
        .optional()
        .describe('Return only this scene in the scenes summary; omit to discover all scenes')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Application name'),
      slug: z.string().optional().describe('Application slug/URL identifier'),
      objects: z
        .array(
          z.object({
            objectKey: z.string().describe('Object key (e.g., "object_1")'),
            name: z.string().describe('Object display name'),
            fields: z
              .array(
                z.object({
                  fieldKey: z.string().describe('Field key (e.g., "field_1")'),
                  name: z.string().describe('Field display name'),
                  fieldType: z
                    .string()
                    .describe('Field type (e.g., "short_text", "number", "connection")'),
                  required: z.boolean().optional().describe('Whether the field is required')
                })
              )
              .describe('Fields in this object')
          })
        )
        .describe('Objects (tables) in the application'),
      scenes: z
        .array(
          z.object({
            sceneKey: z.string().describe('Scene key (e.g., "scene_1")'),
            name: z.string().describe('Scene display name'),
            slug: z.string().optional().describe('Scene slug/URL path'),
            views: z
              .array(
                z.object({
                  viewKey: z.string().describe('View key (e.g., "view_1")'),
                  name: z.string().describe('View display name'),
                  viewType: z.string().describe('View type (e.g., "table", "form", "details")')
                })
              )
              .optional()
              .describe('Views in this scene')
          })
        )
        .optional()
        .describe('Scenes (pages) in the application'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Complete application metadata, including field settings and relationship definitions'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: resolveApplicationId(ctx.auth, ctx.config),
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let metadata = await client.getApplicationMetadata();

    let sourceObjects = array(metadata.objects, 'application objects');
    if (ctx.input.objectKey) {
      sourceObjects = sourceObjects.filter(item => item.key === ctx.input.objectKey);
      if (!sourceObjects.length)
        throw createApiServiceError(
          'The application metadata does not contain that objectKey.'
        );
    }
    let objects = sourceObjects.map(obj => ({
      objectKey: text(obj.key, 'object key'),
      name: text(obj.name, 'object name'),
      fields: array(obj.fields, 'object fields').map(field => ({
        fieldKey: text(field.key, 'field key'),
        name: text(field.name, 'field name'),
        fieldType: text(field.type, 'field type'),
        required: typeof field.required === 'boolean' ? field.required : undefined
      }))
    }));
    let sourceScenes =
      metadata.scenes == null ? undefined : array(metadata.scenes, 'application scenes');
    if (ctx.input.sceneKey) {
      sourceScenes = sourceScenes?.filter(item => item.key === ctx.input.sceneKey);
      if (!sourceScenes?.length)
        throw createApiServiceError(
          'The application metadata does not contain that sceneKey.'
        );
    }
    let scenes = sourceScenes?.map(scene => ({
      sceneKey: text(scene.key, 'scene key'),
      name: text(scene.name, 'scene name'),
      slug: typeof scene.slug === 'string' ? scene.slug : undefined,
      views:
        scene.views == null
          ? undefined
          : array(scene.views, 'scene views').map(view => ({
              viewKey: text(view.key, 'view key'),
              name: text(view.name, 'view name'),
              viewType: text(view.type, 'view type')
            }))
    }));

    return {
      output: {
        name: text(metadata.name, 'application name'),
        slug: typeof metadata.slug === 'string' ? metadata.slug : undefined,
        objects,
        scenes,
        raw: metadata
      },
      message: `Retrieved metadata for **${text(metadata.name, 'application name')}** — **${objects.length}** objects${scenes === undefined ? '' : ` and **${scenes.length}** scenes`}.`
    };
  })
  .build();
