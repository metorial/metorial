import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPhantoms = SlateTool.create(spec, {
  name: 'List Phantoms',
  key: 'list_phantoms',
  description: `List all Phantoms (automation agents) in your workspace. Returns each Phantom's configuration, status, and scheduling information. Use this to discover available Phantoms and their IDs for launching or managing them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      phantoms: z
        .array(
          z.object({
            phantomId: z.string().describe('Unique identifier of the Phantom'),
            name: z.string().describe('Name of the Phantom'),
            scriptId: z.string().optional().describe('ID of the associated script'),
            launchType: z
              .string()
              .optional()
              .describe('How the Phantom is launched (e.g., manually, repeatedly)'),
            repeatedLaunchInterval: z
              .any()
              .optional()
              .describe('Interval for repeated launches'),
            s3Folder: z.string().optional().describe('Cloud storage folder for results'),
            executionTimeLimit: z
              .number()
              .optional()
              .describe('Maximum execution time in seconds'),
            lastEndMessage: z.string().optional().describe('Message from the last execution'),
            lastEndStatus: z.string().optional().describe('Status of the last execution'),
            lastLaunchTimestamp: z
              .number()
              .optional()
              .describe('Timestamp of the last launch in milliseconds')
          })
        )
        .describe('List of Phantoms in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let agents = await client.fetchAllAgents();

    let phantoms = (Array.isArray(agents) ? agents : []).map((agent: any) => ({
      phantomId: String(agent.id),
      name: agent.name ?? '',
      scriptId: agent.scriptId ? String(agent.scriptId) : undefined,
      launchType: agent.launchType ?? undefined,
      repeatedLaunchInterval: agent.repeatedLaunchInterval ?? undefined,
      s3Folder: agent.s3Folder ?? undefined,
      executionTimeLimit: agent.executionTimeLimit ?? undefined,
      lastEndMessage: agent.lastEndMessage ?? undefined,
      lastEndStatus: agent.lastEndStatus ?? undefined,
      lastLaunchTimestamp: agent.lastLaunch ?? undefined
    }));

    return {
      output: { phantoms },
      message: `Found **${phantoms.length}** Phantom(s) in the workspace.`
    };
  })
  .build();
