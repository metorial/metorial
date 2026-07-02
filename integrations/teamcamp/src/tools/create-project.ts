import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in the workspace. Supports setting dates, associating with a customer, and optionally creating from a template. Returns the full newly created project.`
})
  .input(
    z.object({
      projectName: z.string().describe('Name for the new project'),
      customerId: z
        .string()
        .optional()
        .describe('ID of the customer to associate with this project'),
      startDate: z.string().optional().describe('Project start date in yyyy-MM-dd format'),
      dueDate: z.string().optional().describe('Project due date in yyyy-MM-dd format'),
      templateId: z.string().optional().describe('ID of a template to create the project from')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the newly created project'),
      projectName: z.string().describe('Name of the newly created project'),
      workspaceId: z.string().optional().describe('ID of the workspace'),
      ownerId: z.string().optional().describe('ID of the project owner'),
      description: z.string().optional().describe('Project description'),
      customerId: z.string().optional().describe('ID of the associated customer'),
      startDate: z.string().optional().describe('Project start date'),
      dueDate: z.string().optional().describe('Project due date'),
      favoriteUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users who favorited this project'),
      projectUsers: z
        .array(z.string())
        .optional()
        .describe('IDs of users assigned to this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let project = await client.createProject({
      projectName: ctx.input.projectName,
      customerId: ctx.input.customerId,
      startDate: ctx.input.startDate,
      dueDate: ctx.input.dueDate,
      templateId: ctx.input.templateId
    });

    return {
      output: {
        projectId: project.projectId ?? '',
        projectName: project.projectName ?? '',
        workspaceId: project.workspaceId || undefined,
        ownerId: project.ownerId || undefined,
        description: project.description || undefined,
        customerId: project.customerId || undefined,
        startDate: project.startDate || undefined,
        dueDate: project.dueDate || undefined,
        favoriteUsers: Array.isArray(project.favoriteUsers)
          ? project.favoriteUsers
          : undefined,
        projectUsers: Array.isArray(project.projectUsers) ? project.projectUsers : undefined
      },
      message: `Created project **${project.projectName}** (ID: ${project.projectId}).`
    };
  })
  .build();
