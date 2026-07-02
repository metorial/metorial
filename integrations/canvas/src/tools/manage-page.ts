import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let managePageTool = SlateTool.create(spec, {
  name: 'Manage Page',
  key: 'manage_page',
  description: `Create, update, or delete a wiki page in a course. Pages support HTML content and can be set as the course front page. Pages are identified by their URL slug (not a numeric ID).`,
  instructions: [
    'Pages are identified by their URL slug (e.g., "welcome-page"), not a numeric ID.',
    'When creating, a URL slug is auto-generated from the title.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      pageUrl: z
        .string()
        .optional()
        .describe('Page URL slug (required for update/delete, e.g., "welcome-page")'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      title: z.string().optional().describe('Page title'),
      body: z.string().optional().describe('Page content (HTML)'),
      published: z.boolean().optional().describe('Whether the page is published'),
      frontPage: z.boolean().optional().describe('Set as the course front page'),
      editingRoles: z
        .string()
        .optional()
        .describe('Who can edit: "teachers", "students,teachers", "members", or "public"'),
      notifyOfUpdate: z.boolean().optional().describe('Send notification of the update')
    })
  )
  .output(
    z.object({
      pageUrl: z.string().describe('Page URL slug'),
      title: z.string().describe('Page title'),
      published: z.boolean().optional().describe('Whether published'),
      frontPage: z.boolean().optional().describe('Whether front page'),
      createdAt: z.string().optional().describe('Creation date'),
      updatedAt: z.string().optional().describe('Last update date'),
      editingRoles: z.string().optional().describe('Who can edit')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let pageData: Record<string, any> = {};
    if (ctx.input.title) pageData.title = ctx.input.title;
    if (ctx.input.body) pageData.body = ctx.input.body;
    if (ctx.input.published !== undefined) pageData.published = ctx.input.published;
    if (ctx.input.frontPage !== undefined) pageData.front_page = ctx.input.frontPage;
    if (ctx.input.editingRoles) pageData.editing_roles = ctx.input.editingRoles;
    if (ctx.input.notifyOfUpdate !== undefined)
      pageData.notify_of_update = ctx.input.notifyOfUpdate;

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      result = await client.createPage(ctx.input.courseId, pageData);
      actionDesc = 'Created';
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.pageUrl) throw new Error('pageUrl is required for update');
      result = await client.updatePage(ctx.input.courseId, ctx.input.pageUrl, pageData);
      actionDesc = 'Updated';
    } else {
      if (!ctx.input.pageUrl) throw new Error('pageUrl is required for delete');
      result = await client.deletePage(ctx.input.courseId, ctx.input.pageUrl);
      actionDesc = 'Deleted';
    }

    return {
      output: {
        pageUrl: result.url,
        title: result.title,
        published: result.published,
        frontPage: result.front_page,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        editingRoles: result.editing_roles
      },
      message: `${actionDesc} page **${result.title}** (URL: ${result.url}).`
    };
  })
  .build();
