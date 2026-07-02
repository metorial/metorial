import { SlateTool } from 'slates';
import { z } from 'zod';
import { V0Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.string().describe('Unique project identifier'),
  name: z.string().describe('Project name'),
  privacy: z.string().describe('Privacy setting'),
  description: z.string().optional().describe('Project description'),
  instructions: z.string().optional().describe('Project instructions for the AI model'),
  vercelProjectId: z.string().optional().describe('Linked Vercel project ID'),
  createdAt: z.string().describe('ISO timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO timestamp of last update'),
  apiUrl: z.string().describe('API endpoint URL'),
  webUrl: z.string().describe('Web URL for the project')
});

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new V0 project. Projects are containers for chats, code, and deployments. You can optionally set a description, instructions for the AI model, privacy settings, and initial environment variables.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Brief summary of the project purpose'),
      icon: z.string().optional().describe('Visual identifier/emoji for the project'),
      instructions: z
        .string()
        .optional()
        .describe('Guidance for the AI model when working within this project'),
      privacy: z
        .enum(['private', 'team'])
        .optional()
        .describe('Privacy setting. Team privacy is only available on team/enterprise plans'),
      vercelProjectId: z
        .string()
        .optional()
        .describe('ID of an existing Vercel project to link'),
      environmentVariables: z
        .array(
          z.object({
            key: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .optional()
        .describe('Initial environment variables')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.createProject(ctx.input);

    return {
      output: {
        projectId: result.id,
        name: result.name,
        privacy: result.privacy,
        description: result.description,
        instructions: result.instructions,
        vercelProjectId: result.vercelProjectId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        apiUrl: result.apiUrl,
        webUrl: result.webUrl
      },
      message: `Created project **${result.name}** (${result.id}).`
    };
  })
  .build();

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details of a specific V0 project by its ID. Returns project metadata, associated chats, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to retrieve')
    })
  )
  .output(
    projectOutputSchema.extend({
      chats: z
        .array(
          z.object({
            chatId: z.string().describe('Chat identifier'),
            name: z.string().optional().describe('Chat name'),
            privacy: z.string().optional().describe('Chat privacy setting'),
            createdAt: z.string().optional().describe('Chat creation timestamp')
          })
        )
        .optional()
        .describe('Chats associated with this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    let result = await client.getProject(ctx.input.projectId);

    let chats = (result.chats || []).map((c: any) => ({
      chatId: c.id,
      name: c.name,
      privacy: c.privacy,
      createdAt: c.createdAt
    }));

    return {
      output: {
        projectId: result.id,
        name: result.name,
        privacy: result.privacy,
        description: result.description,
        instructions: result.instructions,
        vercelProjectId: result.vercelProjectId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        apiUrl: result.apiUrl,
        webUrl: result.webUrl,
        chats
      },
      message: `Retrieved project **${result.name}** with ${chats.length} chat(s).`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing V0 project's metadata including its name, description, instructions, or privacy setting.`
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to update'),
      name: z.string().optional().describe('New project name'),
      description: z.string().optional().describe('New project description'),
      instructions: z.string().optional().describe('New instructions for the AI model'),
      privacy: z.enum(['private', 'team']).optional().describe('New privacy setting')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let { projectId, ...updateData } = ctx.input;
    let client = new V0Client(ctx.auth.token);
    let result = await client.updateProject(projectId, updateData);

    return {
      output: {
        projectId: result.id,
        name: result.name,
        privacy: result.privacy,
        description: result.description,
        instructions: result.instructions,
        vercelProjectId: result.vercelProjectId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        apiUrl: result.apiUrl,
        webUrl: result.webUrl
      },
      message: `Updated project **${result.name}**.`
    };
  })
  .build();

export let deleteProjectTool = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Permanently delete a V0 project. This operation is irreversible and removes the project and all associated data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to delete')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the deleted project'),
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new V0Client(ctx.auth.token);
    await client.deleteProject(ctx.input.projectId);

    return {
      output: {
        projectId: ctx.input.projectId,
        deleted: true
      },
      message: `Deleted project ${ctx.input.projectId}.`
    };
  })
  .build();
