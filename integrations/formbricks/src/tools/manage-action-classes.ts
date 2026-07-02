import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listActionClasses = SlateTool.create(spec, {
  name: 'List Action Classes',
  key: 'list_action_classes',
  description: `List all action classes in the environment. Action classes represent user behaviors (e.g., page visits, button clicks) that can trigger survey display.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      actionClasses: z.array(
        z.object({
          actionClassId: z.string().describe('Unique action class identifier'),
          name: z.string().describe('Action class name'),
          type: z.string().optional().describe('Action class type'),
          description: z.string().optional().describe('Action class description'),
          environmentId: z.string().optional().describe('Environment ID'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let classes = await client.listActionClasses();

    let mapped = classes.map((ac: any) => ({
      actionClassId: ac.id,
      name: ac.name ?? '',
      type: ac.type,
      description: ac.description,
      environmentId: ac.environmentId,
      createdAt: ac.createdAt ?? ''
    }));

    return {
      output: { actionClasses: mapped },
      message: `Found **${mapped.length}** action class(es).`
    };
  })
  .build();

export let createActionClass = SlateTool.create(spec, {
  name: 'Create Action Class',
  key: 'create_action_class',
  description: `Create a new action class to define a user behavior that can trigger surveys. Actions can represent page visits, button clicks, or other user interactions.`
})
  .input(
    z.object({
      environmentId: z
        .string()
        .describe('ID of the environment to create the action class in'),
      name: z.string().describe('Name of the action class'),
      type: z
        .enum(['code', 'noCode', 'automatic'])
        .describe(
          'Type of action: "code" for custom events, "noCode" for UI-tracked actions, "automatic" for built-in actions'
        ),
      description: z.string().optional().describe('Description of the action class')
    })
  )
  .output(
    z.object({
      actionClassId: z.string().describe('ID of the created action class'),
      name: z.string().describe('Name of the created action class')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let actionClass = await client.createActionClass({
      environmentId: ctx.input.environmentId,
      name: ctx.input.name,
      type: ctx.input.type,
      ...(ctx.input.description ? { description: ctx.input.description } : {})
    });

    return {
      output: {
        actionClassId: actionClass.id,
        name: actionClass.name ?? ctx.input.name
      },
      message: `Created action class **${actionClass.name ?? ctx.input.name}** with ID \`${actionClass.id}\`.`
    };
  })
  .build();

export let deleteActionClass = SlateTool.create(spec, {
  name: 'Delete Action Class',
  key: 'delete_action_class',
  description: `Delete an action class. Surveys using this action as a trigger will no longer be triggered by it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      actionClassId: z.string().describe('ID of the action class to delete')
    })
  )
  .output(
    z.object({
      actionClassId: z.string().describe('ID of the deleted action class')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteActionClass(ctx.input.actionClassId);

    return {
      output: {
        actionClassId: ctx.input.actionClassId
      },
      message: `Deleted action class \`${ctx.input.actionClassId}\`.`
    };
  })
  .build();
