import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let listDepartmentsTool = SlateTool.create(spec, {
  name: 'List Departments',
  key: 'list_departments',
  description: `List all departments in the Workable account. Optionally create a new department. Use this to look up department names for filtering jobs/candidates or when creating requisitions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      departments: z
        .array(
          z.object({
            departmentId: z.string().describe('Department ID'),
            name: z.string().describe('Department name'),
            parentId: z.string().optional().describe('Parent department ID'),
            children: z.array(z.any()).optional().describe('Child departments')
          })
        )
        .describe('List of departments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.listDepartments();
    let departments = (result.departments || []).map((d: any) => ({
      departmentId: d.id,
      name: d.name,
      parentId: d.parent_id,
      children: d.children
    }));

    return {
      output: { departments },
      message: `Found **${departments.length}** department(s).`
    };
  })
  .build();
