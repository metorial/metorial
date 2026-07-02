import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageDepartment = SlateTool.create(spec, {
  name: 'Manage Department',
  key: 'manage_department',
  description: `List, create, or update departments for a company. Departments help organize employees and can be used for reporting and payroll categorization.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: z.string().optional().describe('Company UUID (required for list/create)'),
      departmentId: z.string().optional().describe('Department UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      title: z.string().optional().describe('Department title/name')
    })
  )
  .output(
    z.object({
      departments: z
        .array(
          z.object({
            departmentId: z.string().describe('UUID of the department'),
            title: z.string().optional().describe('Department title'),
            companyId: z.string().optional().describe('Company UUID')
          })
        )
        .optional()
        .describe('List of departments'),
      department: z
        .object({
          departmentId: z.string().describe('UUID of the department'),
          title: z.string().optional().describe('Department title'),
          version: z.string().optional().describe('Current resource version')
        })
        .optional()
        .describe('Created or updated department')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.listDepartments(ctx.input.companyId);
        let departments = Array.isArray(result) ? result : result.departments || result;
        let mapped = departments.map((d: any) => ({
          departmentId: d.uuid || d.id?.toString(),
          title: d.title,
          companyId: d.company_uuid || d.company_id?.toString()
        }));
        return {
          output: { departments: mapped },
          message: `Found **${mapped.length}** department(s).`
        };
      }
      case 'create': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.createDepartment(ctx.input.companyId, {
          title: ctx.input.title
        });
        return {
          output: {
            department: {
              departmentId: result.uuid || result.id?.toString(),
              title: result.title,
              version: result.version
            }
          },
          message: `Created department **${ctx.input.title}**.`
        };
      }
      case 'update': {
        if (!ctx.input.departmentId) throw new Error('departmentId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.title) data.title = ctx.input.title;
        let result = await client.updateDepartment(ctx.input.departmentId, data);
        return {
          output: {
            department: {
              departmentId: result.uuid || result.id?.toString(),
              title: result.title,
              version: result.version
            }
          },
          message: `Updated department ${ctx.input.departmentId}.`
        };
      }
    }
  })
  .build();
