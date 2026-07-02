import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEpicsTool = SlateTool.create(spec, {
  name: 'List Epics',
  key: 'list_epics',
  description: `List all epics in a project. Returns epic names, descriptions, and IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID')
    })
  )
  .output(
    z.object({
      epics: z.array(z.any()).describe('List of epics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listEpics(ctx.input.projectId);

    let epics = response.data || [];

    return {
      output: { epics },
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
      projectId: z.number().describe('The project ID'),
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

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to create epic');
    }

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

    let response = await client.updateEpic({
      epicId: ctx.input.epicId,
      name: ctx.input.name,
      description: ctx.input.description
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update epic');
    }

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

    let response = await client.deleteEpic(ctx.input.epicId);

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to delete epic');
    }

    return {
      output: { success: true },
      message: `Deleted epic **#${ctx.input.epicId}**.`
    };
  })
  .build();
