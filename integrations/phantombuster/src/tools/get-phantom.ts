import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { phantom } from '../lib/responses';
import { spec } from '../spec';

export let getPhantom = SlateTool.create(spec, {
  name: 'Get Phantom',
  key: 'get_phantom',
  description: `Retrieve detailed information about a specific Phantom by its ID, including configuration, script, proxy settings, storage paths, and last execution status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phantomId: z.string().describe('ID of the Phantom to fetch')
    })
  )
  .output(
    z.object({
      phantomId: z.string().describe('Unique identifier of the Phantom'),
      name: z.string().describe('Name of the Phantom'),
      scriptId: z.string().optional().describe('ID of the associated script'),
      script: z.string().optional().describe('Script name'),
      scriptOrg: z.string().optional().describe('Script owner organization name'),
      branch: z.string().optional().describe('Script branch'),
      launchType: z.string().optional().describe('Launch type (e.g., manually, repeatedly)'),
      s3Folder: z.string().optional().describe('Cloud storage folder for results'),
      orgS3Folder: z.string().optional().describe('Organization-level storage folder'),
      executionTimeLimit: z.number().optional().describe('Maximum execution time in seconds'),
      lastEndMessage: z.string().optional().describe('Message from the last execution'),
      lastEndStatus: z.string().optional().describe('Status of the last execution'),
      lastLaunchTimestamp: z
        .number()
        .optional()
        .describe('Timestamp of the last launch in milliseconds'),
      argument: z.any().optional().describe('Current Phantom argument/configuration'),
      proxy: z.any().optional().describe('Proxy configuration'),
      notifications: z.any().optional().describe('Notification settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let agent = await client.fetchAgent(ctx.input.phantomId);

    return {
      output: phantom(agent),
      message: `Retrieved Phantom **${agent.name}** (ID: ${agent.id}).`
    };
  })
  .build();
