import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapProject, mapTask, projectOutputSchema, taskOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.string().describe('Column identifier'),
  projectId: z.string().describe('Parent project ID'),
  name: z.string().describe('Column name'),
  sortOrder: z.number().describe('Display order')
});

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve a project and optionally all its tasks and kanban columns. Use \`includeTasks\` to fetch the full project data with all associated tasks.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve'),
      includeTasks: z
        .boolean()
        .optional()
        .describe(
          'Whether to include all tasks and columns in the response. Defaults to false'
        )
    })
  )
  .output(
    z.object({
      project: projectOutputSchema,
      tasks: z
        .array(taskOutputSchema)
        .optional()
        .describe('Tasks in this project (only when includeTasks is true)'),
      columns: z
        .array(columnSchema)
        .optional()
        .describe('Kanban columns (only when includeTasks is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.includeTasks) {
      let data = await client.getProjectData(ctx.input.projectId);

      return {
        output: {
          project: mapProject(data.project),
          tasks: data.tasks.map(mapTask),
          columns: data.columns?.map(col => ({
            columnId: col.id,
            projectId: col.projectId,
            name: col.name,
            sortOrder: col.sortOrder
          }))
        },
        message: `Retrieved project **${data.project.name}** with **${data.tasks.length}** task(s).`
      };
    }

    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        project: mapProject(project)
      },
      message: `Retrieved project **${project.name}**.`
    };
  })
  .build();
