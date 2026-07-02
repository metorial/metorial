import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

export let createChangeTrackingMarker = SlateTool.create(spec, {
  name: 'Create Change Tracking Marker',
  key: 'create_change_tracking_marker',
  description: `Record a deployment or change event for an entity. Change tracking markers appear on New Relic charts, allowing you to correlate deployments with performance changes.`,
  instructions: [
    'Provide the `entityGuid` of the application or service being deployed.',
    'Include a required `version` to identify the deployment, and optionally a `commit`, `changelog`, `description`, and `timestamp`.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      entityGuid: z
        .string()
        .describe('Entity GUID of the application or service being deployed'),
      version: z.string().describe('Version or release identifier, e.g. "v1.2.3"'),
      changelog: z.string().optional().describe('Changelog or release notes'),
      commit: z.string().optional().describe('Git commit SHA'),
      description: z.string().optional().describe('Description of the change'),
      deploymentType: z
        .enum(['BASIC', 'BLUE_GREEN', 'CANARY', 'OTHER', 'ROLLING', 'SHADOW'])
        .optional()
        .describe('Type of deployment'),
      deepLink: z
        .string()
        .optional()
        .describe('URL link to the deployment system (e.g. CI/CD pipeline)'),
      groupId: z.string().optional().describe('Group ID to correlate related deployments'),
      user: z.string().optional().describe('User who initiated the deployment'),
      timestamp: z
        .number()
        .optional()
        .describe('Deployment timestamp in milliseconds since the Unix epoch')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Unique deployment marker ID'),
      entityGuid: z.string().describe('Entity GUID the deployment was recorded for'),
      version: z.string().optional().describe('Deployment version'),
      timestamp: z.number().optional().describe('Deployment timestamp (epoch ms)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    ctx.progress('Creating change tracking marker...');
    let result = await client.createChangeTrackingMarker({
      entityGuid: ctx.input.entityGuid,
      version: ctx.input.version,
      changelog: ctx.input.changelog,
      commit: ctx.input.commit,
      description: ctx.input.description,
      deploymentType: ctx.input.deploymentType,
      deepLink: ctx.input.deepLink,
      groupId: ctx.input.groupId,
      user: ctx.input.user,
      timestamp: ctx.input.timestamp
    });

    return {
      output: {
        deploymentId: result?.deploymentId,
        entityGuid: result?.entityGuid,
        version: result?.version,
        timestamp: result?.timestamp
      },
      message: `Change tracking marker created for entity **${ctx.input.entityGuid}**${ctx.input.version ? ` (version: ${ctx.input.version})` : ''}.`
    };
  })
  .build();
