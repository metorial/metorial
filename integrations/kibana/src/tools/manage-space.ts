import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let spaceSchema = z.object({
  spaceId: z.string().describe('Unique ID of the space'),
  name: z.string().describe('Display name of the space'),
  description: z.string().optional().describe('Description of the space'),
  color: z.string().optional().describe('Hex color code for the space'),
  initials: z.string().optional().describe('Custom initials shown in the space avatar'),
  disabledFeatures: z
    .array(z.string())
    .optional()
    .describe('List of Kibana features disabled in this space')
});

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `List all Kibana spaces. Spaces organize dashboards and other saved objects into meaningful categories.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      spaces: z.array(spaceSchema).describe('List of Kibana spaces')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let spaces = await client.getSpaces();

    let mapped = spaces.map((s: any) => ({
      spaceId: s.id,
      name: s.name,
      description: s.description,
      color: s.color,
      initials: s.initials,
      disabledFeatures: s.disabledFeatures
    }));

    return {
      output: { spaces: mapped },
      message: `Found **${mapped.length}** spaces.`
    };
  })
  .build();

export let manageSpace = SlateTool.create(spec, {
  name: 'Manage Space',
  key: 'manage_space',
  description: `Create, get, update, or delete a Kibana space. Spaces enable organizing dashboards and other saved objects into meaningful categories.
Rules and connectors are isolated to the space in which they were created.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      spaceId: z.string().describe('Unique ID of the space'),
      name: z.string().optional().describe('Display name (required for create)'),
      description: z.string().optional().describe('Description of the space'),
      color: z.string().optional().describe('Hex color code (e.g., "#aabbcc")'),
      initials: z
        .string()
        .optional()
        .describe('Custom initials for the space avatar (1-2 characters)'),
      disabledFeatures: z
        .array(z.string())
        .optional()
        .describe('List of Kibana features to disable in this space')
    })
  )
  .output(
    spaceSchema.extend({
      deleted: z.boolean().optional().describe('Whether the space was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, spaceId, name, description, color, initials, disabledFeatures } = ctx.input;

    if (action === 'get') {
      let space = await client.getSpace(spaceId);
      return {
        output: {
          spaceId: space.id,
          name: space.name,
          description: space.description,
          color: space.color,
          initials: space.initials,
          disabledFeatures: space.disabledFeatures
        },
        message: `Retrieved space \`${space.name}\`.`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('name is required for create action');
      let space = await client.createSpace({
        id: spaceId,
        name,
        description,
        color,
        initials,
        disabledFeatures
      });
      return {
        output: {
          spaceId: space.id ?? spaceId,
          name: space.name ?? name,
          description: space.description,
          color: space.color,
          initials: space.initials,
          disabledFeatures: space.disabledFeatures
        },
        message: `Created space \`${name}\` with ID \`${spaceId}\`.`
      };
    }

    if (action === 'update') {
      let space = await client.updateSpace(spaceId, {
        name,
        description,
        color,
        initials,
        disabledFeatures
      });
      return {
        output: {
          spaceId: space.id ?? spaceId,
          name: space.name ?? name ?? '',
          description: space.description,
          color: space.color,
          initials: space.initials,
          disabledFeatures: space.disabledFeatures
        },
        message: `Updated space \`${spaceId}\`.`
      };
    }

    if (action === 'delete') {
      await client.deleteSpace(spaceId);
      return {
        output: {
          spaceId,
          name: '',
          deleted: true
        },
        message: `Deleted space \`${spaceId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
