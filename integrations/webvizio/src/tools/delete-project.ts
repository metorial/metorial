import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteProject = SlateTool.create(spec, {
  name: 'Delete Project',
  key: 'delete_project',
  description: `Deletes a project from Webvizio. Identify the project by its ID, UUID, or external ID. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Webvizio internal project ID'),
      uuid: z.string().optional().describe('Project UUID'),
      externalId: z.string().optional().describe('External identifier assigned to the project')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the project was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteProject({
      projectId: ctx.input.projectId,
      uuid: ctx.input.uuid,
      externalId: ctx.input.externalId
    });

    return {
      output: {
        deleted: true
      },
      message: `Successfully deleted project`
    };
  })
  .build();
