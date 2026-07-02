import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all credential groups in your account. Results are paginated. Groups represent courses, programs, or qualifications that credentials are organized under.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to retrieve'),
      pageSize: z.number().optional().describe('Number of groups per page')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().optional().describe('Internal group name'),
            courseName: z.string().optional().describe('Public course name'),
            courseDescription: z.string().optional().describe('Course description'),
            courseLink: z.string().optional().describe('Course URL'),
            credentialCount: z
              .number()
              .optional()
              .describe('Number of credentials in the group')
          })
        )
        .describe('List of credential groups'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      totalCount: z.number().optional().describe('Total number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.listGroups(ctx.input.page, ctx.input.pageSize);

    let groups = result.groups.map((g: any) => ({
      groupId: g.id,
      name: g.name,
      courseName: g.course_name,
      courseDescription: g.course_description,
      courseLink: g.course_link,
      credentialCount: g.credential_count
    }));

    return {
      output: {
        groups,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        totalCount: result.meta?.total_count
      },
      message: `Found **${result.meta?.total_count ?? groups.length}** groups (page ${result.meta?.current_page || 1} of ${result.meta?.total_pages || 1}).`
    };
  })
  .build();
