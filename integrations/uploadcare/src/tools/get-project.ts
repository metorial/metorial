import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project Info',
  key: 'get_project',
  description: `Retrieve information about the current Uploadcare project, including name, public key, autostore setting, and collaborators.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projectName: z.string().optional().describe('Name of the project'),
      publicKey: z.string().optional().describe('Public API key for the project'),
      autostoreEnabled: z
        .boolean()
        .optional()
        .describe('Whether files are automatically stored'),
      collaborators: z
        .array(
          z.object({
            email: z.string().describe('Collaborator email'),
            name: z.string().describe('Collaborator name')
          })
        )
        .optional()
        .describe('List of project collaborators')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let project = await client.getProject();

    return {
      output: {
        projectName: project.name,
        publicKey: project.pub_key,
        autostoreEnabled: project.autostore_enabled,
        collaborators: project.collaborators ?? undefined
      },
      message: 'Retrieved the current Uploadcare project.'
    };
  })
  .build();
