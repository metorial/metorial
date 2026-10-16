import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageDepartment = SlateTool.create(spec, {
  name: 'Manage Department',
  key: 'manage_department',
  description: `Create, retrieve, list, update, or delete departments. Supports multilingual translations for department names.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Action to perform'),
      departmentId: z
        .string()
        .optional()
        .describe('Department ID (required for get, update, delete)'),
      name: z.string().optional().describe('Department name'),
      translations: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Name translations keyed by language code (e.g. {"en": "Engineering", "de": "Technik"})'
        ),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, departmentId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name)
          throw createApiServiceError('name is required for creating a department');
        let result = await client.createDepartment({
          name: ctx.input.name,
          translations: ctx.input.translations
        });
        let data = result;
        return {
          output: { department: data, success: true },
          message: `Department **${ctx.input.name}** created${data?.id ? ` with ID **${data.id}**` : ''}.`
        };
      }
      case 'get': {
        if (!departmentId)
          throw createApiServiceError('departmentId is required for get action');
        let data = await client.getDepartment(departmentId);
        return {
          output: { department: data, success: true },
          message: `Retrieved department **${departmentId}**.`
        };
      }
      case 'list': {
        let result = await client.listDepartments({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result;
        let departments = readList(data, 'departments');
        return {
          output: { departments, success: true, ...listMetadata(data) },
          message: `Found **${departments.length}** department(s).`
        };
      }
      case 'update': {
        if (!departmentId)
          throw createApiServiceError('departmentId is required for update action');
        if (!ctx.input.name)
          throw createApiServiceError('name is required for updating a department');
        let result = await client.updateDepartment(departmentId, { name: ctx.input.name });
        let data = result;
        return {
          output: { department: data, success: true },
          message: `Department **${departmentId}** updated to **${ctx.input.name}**.`
        };
      }
      case 'delete': {
        if (!departmentId)
          throw createApiServiceError('departmentId is required for delete action');
        await client.deleteDepartment(departmentId);
        return {
          output: { success: true },
          message: `Department **${departmentId}** deleted.`
        };
      }
    }
  })
  .build();
