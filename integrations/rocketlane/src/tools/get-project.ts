import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieves detailed information about a specific project by its ID, including status, dates, owner, customer, custom fields, and progress.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique project ID'),
      projectName: z.string().describe('Project name'),
      projectDescription: z.string().nullable().optional().describe('Project description'),
      startDate: z.string().nullable().optional().describe('Start date'),
      dueDate: z.string().nullable().optional().describe('Due date'),
      archived: z.boolean().optional().describe('Whether the project is archived'),
      status: z.any().optional().describe('Project status with value and label'),
      progressPercentage: z.number().optional().describe('Progress percentage'),
      customer: z.any().optional().describe('Associated customer company'),
      owner: z.any().optional().describe('Project owner'),
      visibility: z.string().optional().describe('Project visibility'),
      createdAt: z.number().optional().describe('Creation timestamp (epoch ms)'),
      updatedAt: z.number().optional().describe('Last update timestamp (epoch ms)'),
      createdBy: z.any().optional().describe('User who created the project'),
      updatedBy: z.any().optional().describe('User who last updated the project'),
      fields: z.array(z.any()).optional().describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getProject(ctx.input.projectId);

    return {
      output: result,
      message: `Retrieved project **${result.projectName}** (ID: ${result.projectId}).`
    };
  })
  .build();
