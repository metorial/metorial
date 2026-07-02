import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deploymentEvents = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description:
    'Triggers when a deployment is completed or fails in a DeployHQ project. Polls for new deployments and detects status changes.'
})
  .input(
    z.object({
      projectPermalink: z.string().describe('Project permalink'),
      deploymentIdentifier: z.string().describe('Deployment identifier'),
      status: z.string().describe('Deployment status'),
      deployer: z.string().optional().describe('Who triggered the deployment'),
      branch: z.string().optional().describe('Deployed branch'),
      endRevisionRef: z.string().optional().describe('End revision SHA'),
      endRevisionMessage: z.string().optional().describe('End revision commit message'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp')
    })
  )
  .output(
    z.object({
      projectPermalink: z.string().describe('Project permalink'),
      deploymentIdentifier: z.string().describe('Deployment identifier'),
      status: z.string().describe('Deployment status (completed, failed, etc.)'),
      deployer: z.string().optional().describe('Who triggered the deployment'),
      branch: z.string().optional().describe('Deployed branch'),
      endRevisionRef: z.string().optional().describe('End revision SHA'),
      endRevisionMessage: z.string().optional().describe('End revision commit message'),
      completedAt: z.string().nullable().optional().describe('Completion timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        email: ctx.auth.email,
        accountName: ctx.config.accountName
      });

      let lastSeenIds: string[] = (ctx.state as any)?.lastSeenIds || [];
      let projectPermalinks: string[] = (ctx.state as any)?.projectPermalinks || [];

      // On first run, fetch all projects to monitor
      if (projectPermalinks.length === 0) {
        let projects = await client.listProjects();
        projectPermalinks = projects.map((p: any) => p.permalink);
      }

      let inputs: Array<{
        projectPermalink: string;
        deploymentIdentifier: string;
        status: string;
        deployer?: string;
        branch?: string;
        endRevisionRef?: string;
        endRevisionMessage?: string;
        completedAt?: string | null;
      }> = [];

      let newSeenIds: string[] = [];

      for (let permalink of projectPermalinks) {
        try {
          let deployments = await client.listDeployments(permalink);
          let list = Array.isArray(deployments) ? deployments : [];

          for (let d of list) {
            // Only track completed or failed deployments
            if (d.status !== 'completed' && d.status !== 'failed') continue;

            newSeenIds.push(d.identifier);

            if (!lastSeenIds.includes(d.identifier)) {
              inputs.push({
                projectPermalink: permalink,
                deploymentIdentifier: d.identifier,
                status: d.status,
                deployer: d.deployer,
                branch: d.branch,
                endRevisionRef: d.end_revision?.ref,
                endRevisionMessage: d.end_revision?.message,
                completedAt: d.completed_at ?? null
              });
            }
          }
        } catch {
          // Skip projects that fail (e.g., deleted)
        }
      }

      return {
        inputs,
        updatedState: {
          lastSeenIds: newSeenIds,
          projectPermalinks
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `deployment.${ctx.input.status}`,
        id: ctx.input.deploymentIdentifier,
        output: {
          projectPermalink: ctx.input.projectPermalink,
          deploymentIdentifier: ctx.input.deploymentIdentifier,
          status: ctx.input.status,
          deployer: ctx.input.deployer,
          branch: ctx.input.branch,
          endRevisionRef: ctx.input.endRevisionRef,
          endRevisionMessage: ctx.input.endRevisionMessage,
          completedAt: ctx.input.completedAt
        }
      };
    }
  })
  .build();
