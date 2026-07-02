import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let applicationChanges = SlateTrigger.create(spec, {
  name: 'Application Changes',
  key: 'application_changes',
  description:
    'Polls for changes to applications in an organization, detecting new applications, removed applications, and status/configuration changes.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'removed', 'updated']).describe('Type of change detected'),
      applicationId: z.string().describe('Application ID'),
      applicationName: z.string().describe('Application name'),
      primaryDomain: z.string().optional().describe('Primary domain'),
      framework: z.string().optional().describe('Application framework'),
      sslType: z.string().optional().describe('SSL type'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('List of fields that changed (for updated events)')
    })
  )
  .output(
    z.object({
      applicationId: z.string().describe('Application ID'),
      applicationName: z.string().describe('Application name'),
      primaryDomain: z.string().optional().describe('Primary domain'),
      framework: z.string().optional().describe('Application framework'),
      sslType: z.string().optional().describe('SSL type'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ServerAvatarClient({ token: ctx.auth.token });
      let orgId = ctx.config.organizationId;
      if (!orgId) return { inputs: [], updatedState: ctx.state };

      let result = await client.listApplications(orgId);
      let currentApps = result.applications;

      let previousAppMap: Record<string, Record<string, unknown>> = (ctx.state
        ?.appMap as Record<string, Record<string, unknown>>) || {};
      let currentAppMap: Record<string, Record<string, unknown>> = {};
      let inputs: Array<{
        eventType: 'created' | 'removed' | 'updated';
        applicationId: string;
        applicationName: string;
        primaryDomain?: string;
        framework?: string;
        sslType?: string;
        changedFields?: string[];
      }> = [];

      for (let app of currentApps) {
        let id = String(app.id);
        currentAppMap[id] = {
          name: app.name,
          primary_domain: app.primary_domain,
          framework: app.framework,
          ssl_type: app.ssl_type
        };

        let prev = previousAppMap[id];
        if (!prev) {
          inputs.push({
            eventType: 'created',
            applicationId: id,
            applicationName: (app.name as string) || '',
            primaryDomain: app.primary_domain as string | undefined,
            framework: app.framework as string | undefined,
            sslType: app.ssl_type as string | undefined
          });
        } else {
          let trackedFields = ['name', 'primary_domain', 'framework', 'ssl_type'] as const;
          let changedFields: string[] = [];
          for (let field of trackedFields) {
            if (String(prev[field] ?? '') !== String(currentAppMap[id][field] ?? '')) {
              changedFields.push(field);
            }
          }
          if (changedFields.length > 0) {
            inputs.push({
              eventType: 'updated',
              applicationId: id,
              applicationName: (app.name as string) || '',
              primaryDomain: app.primary_domain as string | undefined,
              framework: app.framework as string | undefined,
              sslType: app.ssl_type as string | undefined,
              changedFields
            });
          }
        }
      }

      let currentIds = new Set(Object.keys(currentAppMap));
      for (let prevId of Object.keys(previousAppMap)) {
        if (!currentIds.has(prevId)) {
          let prevApp = previousAppMap[prevId];
          if (!prevApp) continue;
          inputs.push({
            eventType: 'removed',
            applicationId: prevId,
            applicationName: (prevApp.name as string) || '',
            primaryDomain: prevApp.primary_domain as string | undefined,
            framework: prevApp.framework as string | undefined,
            sslType: undefined
          });
        }
      }

      return {
        inputs,
        updatedState: {
          appMap: currentAppMap,
          lastPolled: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let { eventType, applicationId } = ctx.input;
      let timestamp = new Date().toISOString();

      return {
        type: `application.${eventType}`,
        id: `app_${applicationId}_${eventType}_${timestamp}`,
        output: {
          applicationId: ctx.input.applicationId,
          applicationName: ctx.input.applicationName,
          primaryDomain: ctx.input.primaryDomain,
          framework: ctx.input.framework,
          sslType: ctx.input.sslType,
          changedFields: ctx.input.changedFields
        }
      };
    }
  })
  .build();
