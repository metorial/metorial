import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDepartments = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description: `List all departments in Freshservice. Useful for looking up department IDs when creating or filtering tickets, problems, or changes.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      departments: z.array(
        z.object({
          departmentId: z.number().describe('Department ID'),
          name: z.string().describe('Department name'),
          description: z.string().nullable().describe('Description'),
          headUserId: z.number().nullable().describe('ID of the department head'),
          domains: z.array(z.string()).nullable().describe('Associated email domains'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listDepartments({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let departments = result.departments.map((d: Record<string, unknown>) => ({
      departmentId: d.id as number,
      name: d.name as string,
      description: d.description as string | null,
      headUserId: d.head_user_id as number | null,
      domains: d.domains as string[] | null,
      createdAt: d.created_at as string,
      updatedAt: d.updated_at as string
    }));

    return {
      output: { departments },
      message: `Found **${departments.length}** departments`
    };
  })
  .build();

export let getDepartment = SlateTool.create(spec, {
  name: 'Get Department',
  key: 'get_department',
  description: `Retrieve a single department by its ID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      departmentId: z.number().describe('ID of the department')
    })
  )
  .output(
    z.object({
      departmentId: z.number().describe('Department ID'),
      name: z.string().describe('Department name'),
      description: z.string().nullable().describe('Description'),
      headUserId: z.number().nullable().describe('Department head user ID'),
      domains: z.array(z.string()).nullable().describe('Email domains'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let dept = await client.getDepartment(ctx.input.departmentId);

    return {
      output: {
        departmentId: dept.id,
        name: dept.name,
        description: dept.description,
        headUserId: dept.head_user_id,
        domains: dept.domains,
        createdAt: dept.created_at,
        updatedAt: dept.updated_at
      },
      message: `Retrieved department **#${dept.id}**: "${dept.name}"`
    };
  })
  .build();
