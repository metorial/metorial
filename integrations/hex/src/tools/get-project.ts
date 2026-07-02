import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sharingSchema = z
  .object({
    workspace: z.string().optional(),
    publicWeb: z.string().optional(),
    users: z.array(z.object({ userId: z.string(), accessLevel: z.string() })).optional(),
    groups: z.array(z.object({ groupId: z.string(), accessLevel: z.string() })).optional(),
    collections: z
      .array(z.object({ collectionId: z.string(), accessLevel: z.string() }))
      .optional()
  })
  .optional();

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed metadata about a single Hex project, including title, description, status, categories, creator, owner, timestamps, and optionally sharing permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('UUID of the project to retrieve'),
      includeSharing: z
        .boolean()
        .optional()
        .describe('Include sharing permissions in the response')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      title: z.string(),
      description: z.string().nullable(),
      status: z.string().nullable(),
      categories: z.array(z.string()),
      creator: z
        .object({ userId: z.string(), email: z.string(), name: z.string() })
        .nullable(),
      owner: z.object({ userId: z.string(), email: z.string(), name: z.string() }).nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      publishedAt: z.string().nullable(),
      sharing: sharingSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let project = await client.getProject(ctx.input.projectId, ctx.input.includeSharing);

    return {
      output: project,
      message: `Retrieved project **${project.title}** (${project.projectId}).`
    };
  })
  .build();
