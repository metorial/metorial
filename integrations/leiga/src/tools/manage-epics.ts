import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listEpicsTool = SlateTool.create(spec, {
  name: 'List Epics',
  key: 'list_epics',
  description: `List one page of epics in a project. Call list_projects to discover project IDs. Returns epic names, descriptions, IDs, and total count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      pageNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .default(1)
        .describe('Page number starting at 1'),
      pageSize: z.number().int().positive().optional().default(50).describe('Epics per page')
    })
  )
  .output(
    z.object({
      epics: z.array(z.any()).describe('List of epics'),
      total: z.number().optional().describe('Total matching epics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listEpics(
      ctx.input.projectId,
      ctx.input.pageNumber,
      ctx.input.pageSize
    );

    let epics = response.data?.list || [];

    return {
      output: { epics, total: response.data?.total },
      message: `Found **${epics.length}** epic(s).`
    };
  })
  .build();

export let createEpicTool = SlateTool.create(spec, {
  name: 'Create Epic',
  key: 'create_epic',
  description: `Create a new epic in a Leiga project. Epics group related issues together for larger feature or initiative tracking.`
})
  .input(
    z.object({
      projectId: projectIdSchema,
      name: z.string().describe('Epic name'),
      description: z.string().optional().describe('Epic description')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the epic was created'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createEpic({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { success: true, raw: response.data },
      message: `Created epic **"${ctx.input.name}"**.`
    };
  })
  .build();

export let updateEpicTool = SlateTool.create(spec, {
  name: 'Update Epic',
  key: 'update_epic',
  description: `Update an epic's name or description.`
})
  .input(
    z.object({
      epicId: z.number().describe('The epic ID to update'),
      name: z.string().optional().describe('New epic name'),
      description: z.string().optional().describe('New epic description')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updateEpic({
      epicId: ctx.input.epicId,
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { success: true },
      message: `Updated epic **#${ctx.input.epicId}**.`
    };
  })
  .build();

export let deleteEpicTool = SlateTool.create(spec, {
  name: 'Delete Epic',
  key: 'delete_epic',
  description: `Delete an epic from a project.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      epicId: z.number().describe('The epic ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteEpic(ctx.input.epicId);

    return {
      output: { success: true },
      message: `Deleted epic **#${ctx.input.epicId}**.`
    };
  })
  .build();
