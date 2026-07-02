import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let addApplication = SlateTool.create(spec, {
  name: 'Add Application',
  key: 'add_application',
  description: `Add a new application to Codemagic from a Git repository URL. Supports both public and private repositories. For private repos, provide an SSH key for authentication.`,
  instructions: [
    'For public repositories, only the repositoryUrl is required.',
    'For private repositories, provide the sshKey object with a base64-encoded private key.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      repositoryUrl: z.string().describe('SSH or HTTPS URL of the Git repository'),
      teamId: z.string().optional().describe('Team ID to assign the application to'),
      sshKey: z
        .object({
          data: z.string().describe('Base64-encoded private SSH key'),
          passphrase: z.string().optional().describe('Passphrase for the SSH key, if any')
        })
        .optional()
        .describe('SSH key for private repository access'),
      projectType: z
        .string()
        .optional()
        .describe('Project type, e.g. "flutter-app" for Flutter applications')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('ID of the newly added application'),
      appName: z.string().describe('Name of the newly added application')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });
    let app: any;

    if (ctx.input.sshKey) {
      app = await client.addPrivateApplication({
        repositoryUrl: ctx.input.repositoryUrl,
        sshKey: {
          data: ctx.input.sshKey.data,
          passphrase: ctx.input.sshKey.passphrase ?? null
        },
        projectType: ctx.input.projectType,
        teamId: ctx.input.teamId
      });
    } else {
      app = await client.addApplication({
        repositoryUrl: ctx.input.repositoryUrl,
        teamId: ctx.input.teamId
      });
    }

    return {
      output: {
        appId: app._id,
        appName: app.appName
      },
      message: `Added application **${app.appName}** (${app._id}) from \`${ctx.input.repositoryUrl}\`.`
    };
  })
  .build();
