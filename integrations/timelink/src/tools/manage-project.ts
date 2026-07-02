import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectOutputSchema = z.object({
  projectId: z.number().describe('Unique identifier of the project'),
  name: z.string().describe('Name of the project'),
  info: z.string().optional().describe('Description or additional information'),
  color: z.string().optional().describe('Color code for the project'),
  acronym: z.string().optional().describe('Short acronym for the project'),
  active: z.boolean().optional().describe('Whether the project is active'),
  billable: z.boolean().optional().describe('Whether the project is billable'),
  clientId: z.number().optional().describe('ID of the associated client'),
  externalId: z.string().optional().describe('External ID for syncing with other systems')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all projects in Timelink. Returns project details including name, associated client, billing status, and active status. Use this to find project IDs for time entries.`,
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
    let client = new Client({ token: ctx.auth.token });
    let projects = await client.listProjects();

    let mapped = projects.map(p => ({
      projectId: p.id,
      name: p.name,
      info: p.info,
      color: p.color,
      acronym: p.acronym,
      active: p.active,
      billable: p.billable,
      clientId: p.clientId ?? p.client_id,
      externalId: p.externalId ?? p.external_id
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details of a specific project by ID. Returns full project information including name, associated client, billing and active status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to retrieve')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let p = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        info: p.info,
        color: p.color,
        acronym: p.acronym,
        active: p.active,
        billable: p.billable,
        clientId: p.clientId ?? p.client_id,
        externalId: p.externalId ?? p.external_id
      },
      message: `Retrieved project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Timelink. Projects can be linked to a client and used to categorize time entries. Configure billing, active status, and an external ID for syncing.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      info: z
        .string()
        .optional()
        .describe('Description or additional information about the project'),
      color: z.string().optional().describe('Color code for the project (e.g., hex color)'),
      acronym: z.string().optional().describe('Short acronym for the project'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the project is active (defaults to true)'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      clientId: z
        .number()
        .optional()
        .describe('ID of the client to associate this project with'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let p = await client.createProject(ctx.input);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        info: p.info,
        color: p.color,
        acronym: p.acronym,
        active: p.active,
        billable: p.billable,
        clientId: p.clientId ?? p.client_id,
        externalId: p.externalId ?? p.external_id
      },
      message: `Created project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();

export let updateProjectTool = SlateTool.create(spec, {
  name: 'Update Project',
  key: 'update_project',
  description: `Update an existing project in Timelink. Only the provided fields will be updated; omitted fields remain unchanged. Can reassign the project to a different client.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to update'),
      name: z.string().optional().describe('New name for the project'),
      info: z.string().optional().describe('New description or additional information'),
      color: z.string().optional().describe('New color code for the project'),
      acronym: z.string().optional().describe('New acronym for the project'),
      active: z.boolean().optional().describe('Whether the project is active'),
      billable: z.boolean().optional().describe('Whether the project is billable'),
      clientId: z
        .number()
        .optional()
        .describe('ID of the client to associate this project with'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .output(projectOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { projectId, ...updateData } = ctx.input;
    let p = await client.updateProject(projectId, updateData);

    return {
      output: {
        projectId: p.id,
        name: p.name,
        info: p.info,
        color: p.color,
        acronym: p.acronym,
        active: p.active,
        billable: p.billable,
        clientId: p.clientId ?? p.client_id,
        externalId: p.externalId ?? p.external_id
      },
      message: `Updated project **${p.name}** (ID: ${p.id}).`
    };
  })
  .build();
