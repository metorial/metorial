import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailtrapClient } from '../lib/client';
import { spec } from '../spec';

export let listSandboxProjects = SlateTool.create(spec, {
  name: 'List Sandbox Projects',
  key: 'list_sandbox_projects',
  description: `List all sandbox projects and their inboxes. Projects contain sandbox inboxes where test emails are captured. Use this to discover inbox IDs needed for other sandbox operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            name: z.string().describe('Project name'),
            inboxes: z
              .array(
                z.object({
                  inboxId: z.number().describe('Inbox ID'),
                  name: z.string().optional().describe('Inbox name'),
                  emailUsername: z.string().optional().describe('Inbox email username')
                })
              )
              .optional()
              .describe('Inboxes within this project')
          })
        )
        .describe('List of sandbox projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailtrapClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listProjects();
    let projects = (Array.isArray(result) ? result : []).map((p: any) => ({
      projectId: p.id,
      name: p.name || '',
      inboxes: (p.inboxes || []).map((i: any) => ({
        inboxId: i.id,
        name: i.name,
        emailUsername: i.email_username
      }))
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** sandbox project(s).`
    };
  })
  .build();
