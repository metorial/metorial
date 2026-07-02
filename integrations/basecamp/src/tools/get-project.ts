import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let dockItemSchema = z.object({
  name: z
    .string()
    .describe('Name of the tool (e.g., message_board, todoset, vault, schedule, chat)'),
  title: z.string().describe('Display title of the tool'),
  enabled: z.boolean().describe('Whether the tool is enabled for this project'),
  toolId: z.number().nullable().describe('ID of the tool instance, used in API calls')
});

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Get detailed information about a specific Basecamp project, including its dock (available tools like message board, to-do set, schedule, campfire, vault). The dock provides IDs needed for other operations like creating messages or to-do lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique identifier of the project'),
      name: z.string().describe('Name of the project'),
      description: z.string().nullable().describe('Description of the project'),
      status: z.string().describe('Status of the project'),
      createdAt: z.string().describe('When the project was created'),
      updatedAt: z.string().describe('When the project was last updated'),
      bookmarked: z.boolean().describe('Whether the project is bookmarked'),
      purpose: z.string().nullable().describe('Purpose of the project'),
      dock: z.array(dockItemSchema).describe('Available tools (dock items) for this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let project = await client.getProject(ctx.input.projectId);

    let dock = (project.dock || []).map((d: any) => ({
      name: d.name,
      title: d.title,
      enabled: d.enabled,
      toolId: d.id ?? null
    }));

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null,
        status: project.status,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        bookmarked: project.bookmarked ?? false,
        purpose: project.purpose ?? null,
        dock
      },
      message: `Retrieved project **${project.name}** with ${dock.filter((d: any) => d.enabled).length} enabled tools.`
    };
  })
  .build();
