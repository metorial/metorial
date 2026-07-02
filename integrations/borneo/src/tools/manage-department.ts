import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDepartment = SlateTool.create(spec, {
  name: 'Manage Department',
  key: 'manage_department',
  description: `Create, list, update, or delete departments. Supports multilingual translations for department names.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'list', 'update', 'delete']).describe('Action to perform'),
      departmentId: z
        .string()
        .optional()
        .describe('Department ID (required for update, delete)'),
      name: z.string().optional().describe('Department name'),
      translations: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Name translations keyed by language code (e.g. {"en": "Engineering", "de": "Technik"})'
        ),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        department: z.any().optional().describe('Department record'),
        departments: z.array(z.any()).optional().describe('List of departments'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, departmentId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a department');
        let result = await client.createDepartment({
          name: ctx.input.name,
          translations: ctx.input.translations
        });
        let data = result?.data ?? result;
        return {
          output: { department: data, success: true },
          message: `Department **${ctx.input.name}** created${data?.id ? ` with ID **${data.id}**` : ''}.`
        };
      }
      case 'list': {
        let result = await client.listDepartments({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let departments = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { departments, success: true },
          message: `Found **${departments.length}** department(s).`
        };
      }
      case 'update': {
        if (!departmentId) throw new Error('departmentId is required for update action');
        if (!ctx.input.name) throw new Error('name is required for updating a department');
        let result = await client.updateDepartment(departmentId, { name: ctx.input.name });
        let data = result?.data ?? result;
        return {
          output: { department: data, success: true },
          message: `Department **${departmentId}** updated to **${ctx.input.name}**.`
        };
      }
      case 'delete': {
        if (!departmentId) throw new Error('departmentId is required for delete action');
        await client.deleteDepartment(departmentId);
        return {
          output: { success: true },
          message: `Department **${departmentId}** deleted.`
        };
      }
    }
  })
  .build();
