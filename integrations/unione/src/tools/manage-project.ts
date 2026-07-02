import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Project name'),
  country: z.string().optional().describe('Country code for data handling (e.g., GDPR)'),
  apiKey: z.string().optional().describe('Project-specific API key'),
  sendEnabled: z.boolean().optional().describe('Whether sending is enabled'),
  registeredAt: z.string().optional().describe('Registration timestamp')
});

// ── Create Project ──

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project to isolate domains, templates, webhooks, suppression lists, and sending data. Each project gets its own API key. Requires a user-level API key.`,
  instructions: [
    'Project functionality must be enabled by support before use.',
    'Requires a user API key (not a project API key).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Project name'),
      country: z
        .string()
        .optional()
        .describe('Country code for data handling (e.g., "DE" for GDPR compliance)'),
      sendEnabled: z.boolean().optional().describe('Enable sending for this project'),
      customUnsubscribeUrlEnabled: z
        .boolean()
        .optional()
        .describe('Enable custom unsubscribe URL'),
      backendId: z.number().optional().describe('Custom backend ID')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.createProject({
      name: ctx.input.name,
      country: ctx.input.country,
      sendEnabled: ctx.input.sendEnabled,
      customUnsubscribeUrlEnabled: ctx.input.customUnsubscribeUrlEnabled,
      backendId: ctx.input.backendId
    });

    let p = result.project;

    return {
      output: {
        projectId: p.id,
        name: p.name,
        country: p.country,
        apiKey: p.api_key,
        sendEnabled: p.send_enabled,
        registeredAt: p.reg_time
      },
      message: `Project **${p.name}** created with ID **${p.id}**.${p.api_key ? ` API key: ${p.api_key.substring(0, 8)}...` : ''}`
    };
  })
  .build();

// ── Update Project ──

export let updateProject = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project's settings. Requires a user-level API key.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to update'),
      name: z.string().optional().describe('New project name'),
      country: z.string().optional().describe('Country code for data handling'),
      sendEnabled: z.boolean().optional().describe('Enable or disable sending'),
      customUnsubscribeUrlEnabled: z
        .boolean()
        .optional()
        .describe('Enable custom unsubscribe URL'),
      backendId: z.number().optional().describe('Custom backend ID')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.updateProject({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      country: ctx.input.country,
      sendEnabled: ctx.input.sendEnabled,
      customUnsubscribeUrlEnabled: ctx.input.customUnsubscribeUrlEnabled,
      backendId: ctx.input.backendId
    });

    return {
      output: { success: result.status === 'success' },
      message: `Project **${ctx.input.projectId}** updated.`
    };
  })
  .build();

// ── List Projects ──

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the account. Requires a user-level API key.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(projectOutputSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.listProjects();

    let projects = (result.projects ?? []).map(p => ({
      projectId: p.id,
      name: p.name,
      country: p.country,
      apiKey: p.api_key,
      sendEnabled: p.send_enabled,
      registeredAt: p.reg_time
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

// ── Delete Project ──

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Delete a project and all its associated data (domains, templates, webhooks, suppression lists). This is permanent. Requires a user-level API key.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the project was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.deleteProject(ctx.input.projectId);

    return {
      output: { success: result.status === 'success' },
      message: `Project **${ctx.input.projectId}** deleted.`
    };
  })
  .build();
