import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

export let versionPublished = SlateTrigger.create(spec, {
  name: 'Version Published',
  key: 'version_published',
  description:
    'Triggers when a new container version is published (made live). Polls for changes by checking the latest version header for each monitored container.'
})
  .scopes(googleTagManagerActionScopes.versionPublished)
  .input(
    z.object({
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      containerVersionId: z.string().describe('The version ID that was detected'),
      versionName: z.string().optional().describe('Version name'),
      numTags: z.string().optional().describe('Number of tags in this version'),
      numTriggers: z.string().optional().describe('Number of triggers in this version'),
      numVariables: z.string().optional().describe('Number of variables in this version'),
      detectedAt: z.string().describe('ISO timestamp when the change was detected')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      containerVersionId: z.string().describe('Published version ID'),
      versionName: z.string().optional().describe('Version name'),
      numTags: z.string().optional().describe('Number of tags in this version'),
      numTriggers: z.string().optional().describe('Number of triggers in this version'),
      numVariables: z.string().optional().describe('Number of variables in this version')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GtmClient(ctx.auth.token);

      // State tracks the last known live version for each account/container pair
      let knownVersions = (ctx.state?.knownVersions || {}) as Record<string, string>;
      let monitoredContainers = (ctx.state?.monitoredContainers || []) as Array<{
        accountId: string;
        containerId: string;
      }>;

      // On first run, discover accounts and containers to monitor
      if (monitoredContainers.length === 0) {
        let accountsResponse = await client.listAccounts();
        let accounts = accountsResponse.account || [];

        for (let account of accounts) {
          if (!account.accountId) continue;
          let containersResponse = await client.listContainers(account.accountId);
          let containers = containersResponse.container || [];

          for (let container of containers) {
            if (!container.containerId) continue;
            monitoredContainers.push({
              accountId: account.accountId,
              containerId: container.containerId
            });

            // Initialize known version to current live version
            try {
              let liveVersion = await client.getLiveVersion(
                account.accountId,
                container.containerId
              );
              if (liveVersion.containerVersionId) {
                let key = `${account.accountId}/${container.containerId}`;
                knownVersions[key] = liveVersion.containerVersionId;
              }
            } catch {
              // Container may not have a live version yet
            }
          }
        }

        return {
          inputs: [],
          updatedState: {
            knownVersions,
            monitoredContainers
          }
        };
      }

      // Check each monitored container for version changes
      let inputs: Array<{
        accountId: string;
        containerId: string;
        containerVersionId: string;
        versionName?: string;
        numTags?: string;
        numTriggers?: string;
        numVariables?: string;
        detectedAt: string;
      }> = [];

      for (let { accountId, containerId } of monitoredContainers) {
        let key = `${accountId}/${containerId}`;
        try {
          let liveVersion = await client.getLiveVersion(accountId, containerId);
          let currentVersionId = liveVersion.containerVersionId;

          if (currentVersionId && currentVersionId !== knownVersions[key]) {
            inputs.push({
              accountId,
              containerId,
              containerVersionId: currentVersionId,
              versionName: liveVersion.name,
              numTags: liveVersion.tag ? String(liveVersion.tag.length) : undefined,
              numTriggers: liveVersion.trigger
                ? String(liveVersion.trigger.length)
                : undefined,
              numVariables: liveVersion.variable
                ? String(liveVersion.variable.length)
                : undefined,
              detectedAt: new Date().toISOString()
            });
            knownVersions[key] = currentVersionId;
          }
        } catch {
          // Skip containers that error (e.g., permission issues, no live version)
        }
      }

      return {
        inputs,
        updatedState: {
          knownVersions,
          monitoredContainers
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'container_version.published',
        id: `${ctx.input.accountId}_${ctx.input.containerId}_${ctx.input.containerVersionId}`,
        output: {
          accountId: ctx.input.accountId,
          containerId: ctx.input.containerId,
          containerVersionId: ctx.input.containerVersionId,
          versionName: ctx.input.versionName,
          numTags: ctx.input.numTags,
          numTriggers: ctx.input.numTriggers,
          numVariables: ctx.input.numVariables
        }
      };
    }
  })
  .build();
