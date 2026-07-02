import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let getAppMetadata = SlateTool.create(spec, {
  name: 'Get App Metadata',
  key: 'get_app_metadata',
  description: `Retrieve the full metadata for your Knack application, including all objects (tables), their fields, scenes (pages), and views. Useful for discovering the data structure, field keys, and object keys needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
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
        .describe('Scenes (pages) in the application')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    let metadata = await client.getApplicationMetadata();

    let objects = (metadata.objects || []).map((obj: any) => ({
      objectKey: obj.key,
      name: obj.name,
      fields: (obj.fields || []).map((field: any) => ({
        fieldKey: field.key,
        name: field.name,
        fieldType: field.type,
        required: field.required || false
      }))
    }));

    let scenes = (metadata.scenes || []).map((scene: any) => ({
      sceneKey: scene.key,
      name: scene.name,
      slug: scene.slug,
      views: (scene.views || []).map((view: any) => ({
        viewKey: view.key,
        name: view.name,
        viewType: view.type
      }))
    }));

    return {
      output: {
        name: metadata.name || '',
        slug: metadata.slug,
        objects,
        scenes
      },
      message: `Retrieved metadata for **${metadata.name || 'app'}** — **${objects.length}** objects and **${scenes.length}** scenes.`
    };
  })
  .build();
