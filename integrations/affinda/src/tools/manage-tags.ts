import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { affindaServiceError } from '../lib/errors';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.number().describe('Affinda tag ID.'),
  name: z.string().optional().describe('Tag name.'),
  workspaceIdentifier: z.string().optional().describe('Workspace identifier.'),
  documentCount: z.number().optional().describe('Number of documents using this tag.')
});

let mapTag = (tag: any) => ({
  tagId: tag.id,
  name: tag.name,
  workspaceIdentifier: tag.workspace,
  documentCount: tag.documentCount
});

let requireTagId = (tagId: number | undefined, action: string) => {
  if (tagId === undefined) {
    throw affindaServiceError(`tagId is required for "${action}".`);
  }

  return tagId;
};

let requireWorkspace = (workspace: string | undefined, action: string) => {
  if (!workspace) {
    throw affindaServiceError(`workspaceIdentifier is required for "${action}".`);
  }

  return workspace;
};

let requireName = (name: string | undefined, action: string) => {
  if (!name) {
    throw affindaServiceError(`name is required for "${action}".`);
  }

  return name;
};

let requireDocuments = (documentIdentifiers: string[] | undefined, action: string) => {
  if (!documentIdentifiers || documentIdentifiers.length === 0) {
    throw affindaServiceError(`documentIdentifiers is required for "${action}".`);
  }

  return documentIdentifiers;
};

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, get, create, update, delete, add, and remove Affinda tags. Tags group documents and can be used as filters when listing documents.`,
  instructions: [
    'For "create", provide name and workspaceIdentifier.',
    'For "update", provide tagId plus at least one of name or workspaceIdentifier.',
    'For "get" or "delete", provide tagId.',
    'For "add_to_documents" or "remove_from_documents", provide tagId and documentIdentifiers.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'add_to_documents',
          'remove_from_documents'
        ])
        .describe('Tag operation to perform.'),
      tagId: z
        .number()
        .optional()
        .describe(
          'Required for get, update, delete, add_to_documents, and remove_from_documents.'
        ),
      name: z
        .string()
        .optional()
        .describe('Tag name for create/update, or name filter for list.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe('Workspace identifier for create/update, or workspace filter for list.'),
      documentIdentifiers: z
        .array(z.string())
        .optional()
        .describe('Document identifiers for add_to_documents and remove_from_documents.'),
      limit: z.number().optional().describe('Maximum number of tags to return for list.'),
      offset: z.number().optional().describe('Pagination offset for list.')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Operation that was performed.'),
      tag: tagOutputSchema.optional().describe('Tag returned by get/create/update.'),
      tags: z.array(tagOutputSchema).optional().describe('Tags returned by list.'),
      count: z.number().optional().describe('Number of tags returned.'),
      affectedDocumentCount: z
        .number()
        .optional()
        .describe('Number of documents affected by add/remove operations.'),
      deleted: z.boolean().optional().describe('Whether a tag was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let result = await client.listTags({
        workspace: ctx.input.workspaceIdentifier,
        name: ctx.input.name,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let tags = (Array.isArray(result) ? result : (result.results ?? [])).map(mapTag);

      return {
        output: {
          action: ctx.input.action,
          tags,
          count: result.count ?? tags.length
        },
        message: `Found **${result.count ?? tags.length}** tag(s).`
      };
    }

    if (ctx.input.action === 'get') {
      let tagId = requireTagId(ctx.input.tagId, ctx.input.action);
      let result = await client.getTag(tagId);

      return {
        output: {
          action: ctx.input.action,
          tag: mapTag(result)
        },
        message: `Retrieved tag \`${tagId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createTag({
        name: requireName(ctx.input.name, ctx.input.action),
        workspace: requireWorkspace(ctx.input.workspaceIdentifier, ctx.input.action)
      });

      return {
        output: {
          action: ctx.input.action,
          tag: mapTag(result)
        },
        message: `Created tag **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let tagId = requireTagId(ctx.input.tagId, ctx.input.action);
      if (!ctx.input.name && !ctx.input.workspaceIdentifier) {
        throw affindaServiceError('Provide name or workspaceIdentifier for "update".');
      }

      let result = await client.updateTag(tagId, {
        name: ctx.input.name,
        workspace: ctx.input.workspaceIdentifier
      });

      return {
        output: {
          action: ctx.input.action,
          tag: mapTag(result)
        },
        message: `Updated tag \`${tagId}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      let tagId = requireTagId(ctx.input.tagId, ctx.input.action);
      await client.deleteTag(tagId);

      return {
        output: {
          action: ctx.input.action,
          deleted: true
        },
        message: `Deleted tag \`${tagId}\`.`
      };
    }

    if (ctx.input.action === 'add_to_documents') {
      let tagId = requireTagId(ctx.input.tagId, ctx.input.action);
      let documentIdentifiers = requireDocuments(
        ctx.input.documentIdentifiers,
        ctx.input.action
      );
      await client.batchAddTag(tagId, documentIdentifiers);

      return {
        output: {
          action: ctx.input.action,
          affectedDocumentCount: documentIdentifiers.length
        },
        message: `Added tag \`${tagId}\` to **${documentIdentifiers.length}** document(s).`
      };
    }

    let tagId = requireTagId(ctx.input.tagId, ctx.input.action);
    let documentIdentifiers = requireDocuments(
      ctx.input.documentIdentifiers,
      ctx.input.action
    );
    await client.batchRemoveTag(tagId, documentIdentifiers);

    return {
      output: {
        action: ctx.input.action,
        affectedDocumentCount: documentIdentifiers.length
      },
      message: `Removed tag \`${tagId}\` from **${documentIdentifiers.length}** document(s).`
    };
  })
  .build();
