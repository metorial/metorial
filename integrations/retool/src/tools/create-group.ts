import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createGroup = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create a new permission group in the Retool organization. Groups control access to apps, resources, and workflows. You can optionally add initial members during creation.`
})
  .input(
    z.object({
      groupName: z.string().describe('Name for the new group'),
      universalAppAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for all apps'),
      universalResourceAccess: z
        .enum(['none', 'user', 'admin'])
        .optional()
        .describe('Default access level for all resources'),
      universalWorkflowAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for all workflows'),
      universalQueryLibraryAccess: z
        .enum(['none', 'use', 'edit', 'own'])
        .optional()
        .describe('Default access level for the query library'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('User ID to add to the group'),
            isGroupAdmin: z.boolean().optional().describe('Whether the user is a group admin')
          })
        )
        .optional()
        .describe('Initial members to add to the group')
    })
  )
  .output(
    z.object({
      groupId: z.number(),
      groupName: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.createGroup({
      name: ctx.input.groupName,
      universalAppAccess: ctx.input.universalAppAccess,
      universalResourceAccess: ctx.input.universalResourceAccess,
      universalWorkflowAccess: ctx.input.universalWorkflowAccess,
      universalQueryLibraryAccess: ctx.input.universalQueryLibraryAccess,
      members: ctx.input.members?.map(m => ({ id: m.userId, isGroupAdmin: m.isGroupAdmin }))
    });

    let g = result.data;

    return {
      output: {
        groupId: g.id,
        groupName: g.name
      },
      message: `Created group **${g.name}** with ID \`${g.id}\`.`
    };
  })
  .build();
