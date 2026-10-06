import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
import { spec } from '../spec';
export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read an exact organization, group, command, command result or application by native ID. Returns a bounded summary, not credentials, application configuration or a complete association inventory.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgId: orgIdInput,
      resourceType: z.enum([
        'organization',
        'user_group',
        'system_group',
        'command',
        'command_result',
        'application'
      ]),
      resourceId: z
        .string()
        .describe('Exact native resource ID from the corresponding discovery tool.')
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      resourceId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      organizationId: z.string().optional(),
      command: z.string().optional(),
      commandType: z.string().optional(),
      requestTime: z.string().optional(),
      responseTime: z.string().optional(),
      exitCode: z.number().optional(),
      output: z.string().optional(),
      error: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
      const { resourceType: type, resourceId: id } = ctx.input;
      if (type === 'organization') {
        const row = await client.getOrganization(id);
        return {
          output: {
            resourceType: type,
            resourceId: row._id,
            name: row.displayName,
            organizationId: row._id
          },
          message: 'Retrieved the exact authorized organization summary.'
        };
      }
      if (type === 'user_group' || type === 'system_group') {
        const row =
          type === 'user_group'
            ? await client.getUserGroup(id)
            : await client.getSystemGroup(id);
        return {
          output: {
            resourceType: type,
            resourceId: row.id,
            name: row.name,
            description: row.description
          },
          message: 'Retrieved the exact group summary; associations are not included.'
        };
      }
      if (type === 'command') {
        const row = await client.getCommand(id);
        return {
          output: {
            resourceType: type,
            resourceId: row._id,
            name: row.name,
            command: row.command,
            commandType: row.commandType,
            organizationId: row.organization
          },
          message: 'Retrieved the existing command; no execution was requested.'
        };
      }
      if (type === 'application') {
        const row = await client.getApplication(id);
        return {
          output: {
            resourceType: type,
            resourceId: row._id,
            name: row.name,
            organizationId: row.organization
          },
          message: 'Retrieved the application summary without its configuration or secrets.'
        };
      }
      const row = await client.getCommandResult(id);
      return {
        output: {
          resourceType: type,
          resourceId: row._id,
          name: row.name,
          organizationId: row.organization,
          requestTime: row.requestTime ?? undefined,
          responseTime: row.responseTime ?? undefined,
          exitCode: row.response?.data?.exitCode ?? row.exitCode,
          output: row.response?.data?.output,
          error: row.response?.error
        },
        message: 'Retrieved the existing native command result.'
      };
    } catch (error) {
      throw upstream(error);
    }
  })
  .build();
