import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let keywordSchema = z.object({
  keyword: z.string().describe('Canonical keyword value'),
  synonyms: z.array(z.string()).describe('Synonym expressions for this keyword')
});

let entitySchema = z.object({
  entityId: z.string().optional().describe('Unique entity ID'),
  name: z.string().describe('Entity name'),
  roles: z.array(z.string()).optional().describe('Roles defined for this entity'),
  lookups: z
    .array(z.string())
    .optional()
    .describe('Lookup strategies (e.g., "keywords", "free-text")'),
  builtin: z.boolean().optional().describe('Whether this is a built-in entity'),
  keywords: z
    .array(keywordSchema)
    .optional()
    .describe('Keyword values for keyword-type entities')
});

export let listEntities = SlateTool.create(spec, {
  name: 'List Entities',
  key: 'list_entities',
  description: `List all entities configured in the Wit.ai app, including both built-in and custom entities. Returns entity names and IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      entities: z.array(entitySchema).describe('List of entities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let entities = await client.listEntities();

    return {
      output: {
        entities: (entities ?? []).map((e: Record<string, unknown>) => ({
          entityId: e.id,
          name: e.name,
          roles: e.roles as string[] | undefined,
          lookups: e.lookups as string[] | undefined,
          builtin: e.builtin as boolean | undefined
        }))
      },
      message: `Found **${(entities ?? []).length}** entity(ies).`
    };
  })
  .build();

export let getEntity = SlateTool.create(spec, {
  name: 'Get Entity',
  key: 'get_entity',
  description: `Get detailed information about a specific entity, including its roles, lookup strategies, and keyword values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityName: z
        .string()
        .describe('Name or ID of the entity (e.g., "wit$datetime" or "my_entity")')
    })
  )
  .output(entitySchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let entity = await client.getEntity(ctx.input.entityName);

    return {
      output: {
        entityId: entity.id,
        name: entity.name,
        roles: entity.roles,
        lookups: entity.lookups,
        builtin: entity.builtin,
        keywords: (entity.keywords ?? []).map((k: Record<string, unknown>) => ({
          keyword: k.keyword,
          synonyms: k.synonyms ?? []
        }))
      },
      message: `Retrieved entity **${entity.name}**.`
    };
  })
  .build();

export let createEntity = SlateTool.create(spec, {
  name: 'Create Entity',
  key: 'create_entity',
  description: `Create a new custom entity in the Wit.ai app. Entities can be keyword-based (with explicit values) or free-text. Specify roles to distinguish how the entity is used in different contexts (e.g., "origin" vs "destination" for a location entity).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new entity'),
      roles: z.array(z.string()).describe('Roles for the entity (at least one required)'),
      lookups: z
        .array(z.enum(['keywords', 'free-text']))
        .optional()
        .describe('Lookup strategies for the entity'),
      keywords: z
        .array(keywordSchema)
        .optional()
        .describe('Initial keyword values (for keyword-type entities)')
    })
  )
  .output(entitySchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let entity = await client.createEntity({
      name: ctx.input.name,
      roles: ctx.input.roles,
      lookups: ctx.input.lookups,
      keywords: ctx.input.keywords
    });

    return {
      output: {
        entityId: entity.id,
        name: entity.name,
        roles: entity.roles,
        lookups: entity.lookups,
        builtin: entity.builtin,
        keywords: entity.keywords
      },
      message: `Created entity **${entity.name}** with role(s): ${ctx.input.roles.join(', ')}.`
    };
  })
  .build();

export let updateEntity = SlateTool.create(spec, {
  name: 'Update Entity',
  key: 'update_entity',
  description: `Update an existing entity's configuration, such as its name, roles, lookup strategies, or keywords.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      entityName: z.string().describe('Name or ID of the entity to update'),
      name: z.string().optional().describe('New name for the entity'),
      roles: z.array(z.string()).optional().describe('Updated roles'),
      lookups: z.array(z.string()).optional().describe('Updated lookup strategies'),
      keywords: z.array(keywordSchema).optional().describe('Updated keyword values')
    })
  )
  .output(entitySchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.roles !== undefined) updateData.roles = ctx.input.roles;
    if (ctx.input.lookups !== undefined) updateData.lookups = ctx.input.lookups;
    if (ctx.input.keywords !== undefined) updateData.keywords = ctx.input.keywords;

    let entity = await client.updateEntity(ctx.input.entityName, updateData);

    return {
      output: {
        entityId: entity.id,
        name: entity.name,
        roles: entity.roles,
        lookups: entity.lookups,
        builtin: entity.builtin,
        keywords: entity.keywords
      },
      message: `Updated entity **${ctx.input.entityName}**.`
    };
  })
  .build();

export let deleteEntity = SlateTool.create(spec, {
  name: 'Delete Entity',
  key: 'delete_entity',
  description: `Permanently delete an entity from the Wit.ai app. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      entityName: z.string().describe('Name or ID of the entity to delete')
    })
  )
  .output(
    z.object({
      deleted: z.string().describe('Name of the deleted entity')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteEntity(ctx.input.entityName);

    return {
      output: {
        deleted: ctx.input.entityName
      },
      message: `Deleted entity **${ctx.input.entityName}**.`
    };
  })
  .build();

export let manageEntityKeywords = SlateTool.create(spec, {
  name: 'Manage Entity Keywords',
  key: 'manage_entity_keywords',
  description: `Add or remove keywords and synonyms for a keyword-type entity. Use this to expand the vocabulary of an entity by adding new canonical keywords with their synonym expressions, or to remove existing ones.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      entityName: z.string().describe('Name or ID of the entity'),
      action: z
        .enum(['add_keyword', 'delete_keyword', 'add_synonym', 'delete_synonym'])
        .describe('Action to perform'),
      keyword: z.string().describe('The canonical keyword value'),
      synonyms: z
        .array(z.string())
        .optional()
        .describe('Synonym expressions (required for add_keyword)'),
      synonym: z
        .string()
        .optional()
        .describe('Single synonym (required for add_synonym and delete_synonym)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { action, entityName, keyword } = ctx.input;

    if (action === 'add_keyword') {
      await client.addEntityKeyword(entityName, {
        keyword,
        synonyms: ctx.input.synonyms ?? []
      });
    } else if (action === 'delete_keyword') {
      await client.deleteEntityKeyword(entityName, keyword);
    } else if (action === 'add_synonym') {
      if (!ctx.input.synonym) throw new Error('synonym is required for add_synonym action');
      await client.addEntityKeywordSynonym(entityName, keyword, ctx.input.synonym);
    } else if (action === 'delete_synonym') {
      if (!ctx.input.synonym) throw new Error('synonym is required for delete_synonym action');
      await client.deleteEntityKeywordSynonym(entityName, keyword, ctx.input.synonym);
    }

    return {
      output: { success: true },
      message: `Performed **${action}** on entity **${entityName}**, keyword **${keyword}**.`
    };
  })
  .build();
