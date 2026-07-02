import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPermissions = SlateTool.create(spec, {
  name: 'List Permissions',
  key: 'list_permissions',
  description: `Query permissions in two ways: list all objects a user/group has access to, or list all users/groups that have access to a specific object.`,
  constraints: ['Available on Enterprise Premium plan only.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      direction: z
        .enum(['objects_for_subject', 'subjects_for_object'])
        .describe(
          'Query direction: "objects_for_subject" lists objects accessible by a user/group, "subjects_for_object" lists users/groups with access to an object'
        ),
      subjectType: z
        .enum(['user', 'group'])
        .optional()
        .describe('Type of the subject (required for "objects_for_subject")'),
      subjectId: z
        .string()
        .optional()
        .describe('ID of the user or group (required for "objects_for_subject")'),
      objectType: z
        .enum(['app', 'folder', 'resource', 'resource_configuration', 'workflow', 'agent'])
        .optional()
        .describe('Type of the object (required for "subjects_for_object")'),
      objectId: z
        .string()
        .optional()
        .describe('ID of the object (required for "subjects_for_object")')
    })
  )
  .output(
    z.object({
      permissions: z.array(z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result: any;

    if (ctx.input.direction === 'objects_for_subject') {
      if (!ctx.input.subjectType || !ctx.input.subjectId) {
        throw new Error(
          'subjectType and subjectId are required for "objects_for_subject" direction'
        );
      }
      result = await client.listPermissionObjects(ctx.input.subjectType, ctx.input.subjectId);
    } else {
      if (!ctx.input.objectType || !ctx.input.objectId) {
        throw new Error(
          'objectType and objectId are required for "subjects_for_object" direction'
        );
      }
      result = await client.listPermissionSubjects(ctx.input.objectType, ctx.input.objectId);
    }

    let permissions = result.data ?? [];

    return {
      output: {
        permissions
      },
      message: `Found **${permissions.length}** permission entries.`
    };
  })
  .build();
