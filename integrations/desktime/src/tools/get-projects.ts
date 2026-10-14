import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjects = SlateTool.create(spec, {
  name: 'Get Projects',
  key: 'get_projects',
  description:
    'List active DeskTime projects and their tasks, including project IDs, names, and creation dates. Use project and task names with start_project_tracking and stop_project_tracking. Archived projects are excluded.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Active projects and their tasks'),
      rawResponse: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getProjects();
    let collection =
      isApiErrorRecord(response) && response.projects !== undefined
        ? response.projects
        : response;
    let projects = Array.isArray(collection)
      ? collection
      : isApiErrorRecord(collection)
        ? Object.entries(collection)
            .filter(([key]) => !key.startsWith('__'))
            .map(([, value]) => value)
        : undefined;
    if (!projects?.every(isApiErrorRecord)) {
      throw createApiServiceError('DeskTime returned an invalid projects response.', {
        reason: 'desktime_invalid_response'
      });
    }
    return {
      output: { projects, rawResponse: response },
      message: `Retrieved **${projects.length}** active projects.`
    };
  })
  .build();
