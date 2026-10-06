import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { branches, resolveSpace, spaceIdInput } from '../lib/validation';
import { spec } from '../spec';

let componentOutputSchema = z.object({
  componentId: z.number().optional().describe('Numeric ID of the component'),
  name: z.string().optional().describe('Technical name of the component'),
  displayName: z.string().optional().describe('Display name shown in the editor'),
  isRoot: z.boolean().optional().describe('Whether this is a content type (root component)'),
  isNestable: z
    .boolean()
    .optional()
    .describe('Whether this can be nested inside other components'),
  schema: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Component field schema definition'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageComponent = SlateTool.create(spec, {
  name: 'Manage Component',
  key: 'manage_component',
  description: `Create, update, or delete content components (content type definitions). Components define the schema/structure of stories. Use this to manage your content model.`,
  instructions: [
    'To **create** a component, set action to "create" and provide a name and schema.',
    'To **update** a component, set action to "update" and provide the componentId plus fields to change.',
    'To **delete** a component, set action to "delete" and provide the componentId.',
    'Schema is a JSON object where keys are field names and values define field types (e.g. `{ "title": { "type": "text" }, "body": { "type": "richtext" } }`).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: spaceIdInput,
      action: z
        .enum(['create', 'update', 'delete', 'get'])
        .describe('The component management action to perform'),
      componentId: z
        .string()
        .optional()
        .describe('Component ID (required for update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Technical name for the component (required for create)'),
      displayName: z.string().optional().describe('Human-friendly display name'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Field schema definition object'),
      isRoot: z
        .boolean()
        .optional()
        .describe('Whether this is a content type (can be used as a story root)'),
      isNestable: z
        .boolean()
        .optional()
        .describe('Whether this can be nested inside bloks fields'),
      componentGroupUuid: z
        .string()
        .optional()
        .describe('UUID of the component group to organize under'),
      color: z.string().optional().describe('Color for the component in the editor'),
      icon: z.string().optional().describe('Icon for the component in the editor')
    })
  )
  .output(componentOutputSchema)
  .handleInvocation(async ctx => {
    branches(
      ctx.input,
      {
        create: [
          'name',
          'displayName',
          'schema',
          'isRoot',
          'isNestable',
          'componentGroupUuid',
          'color',
          'icon'
        ],
        update: [
          'componentId',
          'name',
          'displayName',
          'schema',
          'isRoot',
          'isNestable',
          'componentGroupUuid',
          'color',
          'icon'
        ],
        delete: ['componentId'],
        get: ['componentId']
      }[ctx.input.action]
    );
    let client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });

    let { action, componentId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name)
        throw createApiServiceError('Name is required to create a component');

      let component = await client.createComponent({
        name: ctx.input.name,
        displayName: ctx.input.displayName,
        schema: ctx.input.schema,
        isRoot: ctx.input.isRoot,
        isNestable: ctx.input.isNestable,
        componentGroupUuid: ctx.input.componentGroupUuid,
        color: ctx.input.color,
        icon: ctx.input.icon
      });

      return {
        output: {
          componentId: component.id,
          name: component.name,
          displayName: component.display_name,
          isRoot: component.is_root,
          isNestable: component.is_nestable,
          schema: component.schema,
          createdAt: component.created_at
        },
        message: `Created component **${component.name}** (\`${component.id}\`).`
      };
    }

    if (!componentId) throw createApiServiceError('componentId is required for this action');

    if (action === 'delete') {
      await client.deleteComponent(componentId);
      return {
        output: { componentId: Number(componentId) },
        message: `Deleted component \`${componentId}\`.`
      };
    }

    // action === 'update'
    let component =
      action === 'get'
        ? await client.getComponent(componentId)
        : await client.updateComponent(componentId, {
            name: ctx.input.name,
            displayName: ctx.input.displayName,
            schema: ctx.input.schema,
            isRoot: ctx.input.isRoot,
            isNestable: ctx.input.isNestable,
            componentGroupUuid: ctx.input.componentGroupUuid,
            color: ctx.input.color,
            icon: ctx.input.icon
          });

    return {
      output: {
        componentId: component.id,
        name: component.name,
        displayName: component.display_name,
        isRoot: component.is_root,
        isNestable: component.is_nestable,
        schema: component.schema,
        createdAt: component.created_at
      },
      message:
        action === 'get'
          ? 'Retrieved the exact component.'
          : `Updated component **${component.name}** (\`${component.id}\`).`
    };
  })
  .build();
