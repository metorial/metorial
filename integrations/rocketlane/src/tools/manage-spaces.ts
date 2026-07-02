import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSpace = SlateTool.create(spec, {
  name: 'Create Space',
  key: 'create_space',
  description: `Creates a new collaborative space within a Rocketlane project for sharing files and documents with team members and customers.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceName: z.string().describe('Name of the space'),
      projectId: z.number().describe('ID of the project this space belongs to'),
      description: z.string().optional().describe('Description of the space')
    })
  )
  .output(
    z.object({
      spaceId: z.number().describe('Unique ID of the created space'),
      spaceName: z.string().describe('Space name'),
      description: z.string().nullable().optional().describe('Space description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSpace({
      spaceName: ctx.input.spaceName,
      projectId: ctx.input.projectId,
      description: ctx.input.description
    });

    return {
      output: result,
      message: `Space **${result.spaceName}** created successfully (ID: ${result.spaceId}).`
    };
  })
  .build();

export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description: `Lists collaborative spaces in Rocketlane with optional project filtering. Can also retrieve documents within a specific space.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter spaces by project ID'),
      spaceId: z
        .number()
        .optional()
        .describe('If provided, also fetches documents within this specific space'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of spaces to return')
    })
  )
  .output(
    z.object({
      spaces: z
        .array(
          z.object({
            spaceId: z.number().describe('Space ID'),
            spaceName: z.string().describe('Space name'),
            description: z.string().nullable().optional().describe('Description')
          })
        )
        .describe('List of spaces'),
      documents: z.array(z.any()).optional().describe('Documents within the specified space')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSpaces({
      projectId: ctx.input.projectId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let spaces = Array.isArray(result) ? result : (result.spaces ?? result.data ?? []);

    let documents: any[] | undefined;
    if (ctx.input.spaceId) {
      let docResult = await client.listSpaceDocuments(ctx.input.spaceId);
      documents = Array.isArray(docResult)
        ? docResult
        : (docResult.documents ?? docResult.data ?? []);
    }

    return {
      output: { spaces, documents },
      message: `Found **${spaces.length}** space(s).${documents ? ` Found **${documents.length}** document(s) in space ${ctx.input.spaceId}.` : ''}`
    };
  })
  .build();

export let updateSpace = SlateTool.create(spec, {
  name: 'Update Space',
  key: 'update_space',
  description: `Updates an existing space in Rocketlane. Supports changing the name and description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: z.number().describe('ID of the space to update'),
      spaceName: z.string().optional().describe('New space name'),
      description: z.string().optional().describe('New space description')
    })
  )
  .output(
    z.object({
      spaceId: z.number().describe('ID of the updated space'),
      spaceName: z.string().optional().describe('Updated space name'),
      description: z.string().nullable().optional().describe('Updated description')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateSpace(ctx.input.spaceId, {
      spaceName: ctx.input.spaceName,
      description: ctx.input.description
    });

    return {
      output: result,
      message: `Space **${result.spaceName || ctx.input.spaceId}** updated successfully.`
    };
  })
  .build();

export let deleteSpace = SlateTool.create(spec, {
  name: 'Delete Space',
  key: 'delete_space',
  description: `Permanently deletes a space from a Rocketlane project.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: z.number().describe('ID of the space to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSpace(ctx.input.spaceId);

    return {
      output: { success: true },
      message: `Space ${ctx.input.spaceId} has been **deleted**.`
    };
  })
  .build();
