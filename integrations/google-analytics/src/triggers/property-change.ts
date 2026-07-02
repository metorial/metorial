import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import { accountResourceName } from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

let lastPathSegment = (value?: string | null) =>
  typeof value === 'string' && value.length > 0
    ? value.split('/').filter(Boolean).at(-1)
    : undefined;

let extractPropertyName = (change: any) => {
  let resource = typeof change.resource === 'string' ? change.resource : undefined;
  if (resource?.startsWith('properties/')) {
    return resource;
  }

  let before = change.resourceBeforeChange?.property?.name;
  if (typeof before === 'string') {
    return before;
  }

  let after = change.resourceAfterChange?.property?.name;
  if (typeof after === 'string') {
    return after;
  }

  return undefined;
};

export let propertyChange = SlateTrigger.create(spec, {
  name: 'Property Change',
  key: 'property_change',
  description:
    'Polls for configuration changes on a GA4 property, including updates to data streams, custom dimensions, custom metrics, key events, audiences, and other property settings.'
})
  .scopes(googleAnalyticsActionScopes.propertyChange)
  .input(
    z.object({
      changeId: z.string().describe('Unique ID for this change history event.'),
      accountId: z.string().optional().describe('Google Analytics account ID.'),
      accountName: z
        .string()
        .optional()
        .describe('Google Analytics account resource name, e.g. "accounts/123456".'),
      accountDisplayName: z.string().optional().describe('Google Analytics account name.'),
      propertyId: z
        .string()
        .optional()
        .describe('GA4 property ID, if the change is property-scoped.'),
      propertyName: z
        .string()
        .optional()
        .describe('GA4 property resource name, e.g. "properties/987654".'),
      propertyDisplayName: z.string().optional().describe('GA4 property display name.'),
      changeTime: z.string().describe('Timestamp of the change.'),
      actorEmail: z.string().optional().describe('Email of the user who made the change.'),
      actorType: z.string().optional().describe('Type of actor (USER, SYSTEM, SUPPORT).'),
      resourceType: z.string().describe('Type of resource that was changed.'),
      action: z.string().describe('The action performed (CREATED, UPDATED, DELETED).'),
      resourceBeforeChange: z.any().optional().describe('Resource state before the change.'),
      resourceAfterChange: z.any().optional().describe('Resource state after the change.')
    })
  )
  .output(
    z.object({
      changeId: z.string().describe('Unique ID for this change history event.'),
      accountId: z.string().optional().describe('Google Analytics account ID.'),
      accountName: z
        .string()
        .optional()
        .describe('Google Analytics account resource name, e.g. "accounts/123456".'),
      accountDisplayName: z.string().optional().describe('Google Analytics account name.'),
      propertyId: z
        .string()
        .optional()
        .describe('GA4 property ID, if the change is property-scoped.'),
      propertyName: z
        .string()
        .optional()
        .describe('GA4 property resource name, e.g. "properties/987654".'),
      propertyDisplayName: z.string().optional().describe('GA4 property display name.'),
      changeTime: z.string().describe('Timestamp when the change occurred.'),
      actorEmail: z
        .string()
        .optional()
        .describe('Email of the user or service account who made the change.'),
      actorType: z.string().optional().describe('Type of actor: USER, SYSTEM, or SUPPORT.'),
      resourceType: z
        .string()
        .describe(
          'Type of resource changed (e.g., DATA_STREAM, CUSTOM_DIMENSION, KEY_EVENT).'
        ),
      action: z.string().describe('Action performed: CREATED, UPDATED, or DELETED.'),
      resourceBeforeChange: z
        .any()
        .optional()
        .describe('Snapshot of the resource before the change.'),
      resourceAfterChange: z
        .any()
        .optional()
        .describe('Snapshot of the resource after the change.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new AnalyticsAdminClient({
        token: ctx.auth.token
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let now = new Date().toISOString();

      let params: any = {
        pageSize: 100
      };

      if (lastPollTime) {
        params.earliestChangeTime = lastPollTime;
        params.latestChangeTime = now;
      } else {
        // First poll: look back 1 hour
        let oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        params.earliestChangeTime = oneHourAgo;
        params.latestChangeTime = now;
      }

      let accountSummaries: any[] = [];
      let pageToken: string | undefined;

      do {
        let summariesResult = await client.listAccountSummaries({
          pageSize: 200,
          pageToken
        });
        accountSummaries.push(...(summariesResult.accountSummaries || []));
        pageToken = summariesResult.nextPageToken;
      } while (pageToken);

      let inputs: Array<{
        changeId: string;
        accountId?: string;
        accountName?: string;
        accountDisplayName?: string;
        propertyId?: string;
        propertyName?: string;
        propertyDisplayName?: string;
        changeTime: string;
        actorEmail?: string;
        actorType?: string;
        resourceType: string;
        action: string;
        resourceBeforeChange?: any;
        resourceAfterChange?: any;
      }> = [];

      for (let summary of accountSummaries) {
        let accountName =
          typeof summary.account === 'string'
            ? summary.account
            : summary.name
              ? accountResourceName(lastPathSegment(summary.name) || summary.name)
              : undefined;

        if (!accountName) {
          continue;
        }

        let propertiesByName = new Map<string, any>(
          (summary.propertySummaries || [])
            .filter((property: any) => typeof property.property === 'string')
            .map((property: any) => [property.property, property])
        );

        let changePageToken: string | undefined;

        do {
          let result = await client.searchChangeHistoryEvents(accountName, {
            ...params,
            pageToken: changePageToken
          });
          let changeEvents = result.changeHistoryEvents || [];
          changePageToken = result.nextPageToken;

          for (let event of changeEvents) {
            let changes = event.changes || [];
            changes.forEach((change: any, index: number) => {
              let propertyName = extractPropertyName(change);
              let property = propertyName ? propertiesByName.get(propertyName) : undefined;

              inputs.push({
                changeId: `${accountName}-${event.id || ''}-${change.resource || index}`,
                accountId: lastPathSegment(accountName),
                accountName,
                accountDisplayName: summary.displayName,
                propertyId: lastPathSegment(propertyName),
                propertyName,
                propertyDisplayName: property?.displayName,
                changeTime: event.changeTime || now,
                actorEmail: event.userActorEmail,
                actorType: event.actorType,
                resourceType: change.resourceType || 'UNKNOWN',
                action: change.action || 'UNKNOWN',
                resourceBeforeChange: change.resourceBeforeChange,
                resourceAfterChange: change.resourceAfterChange
              });
            });
          }
        } while (changePageToken);
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: now
        }
      };
    },

    handleEvent: async ctx => {
      let action = (ctx.input.action || 'unknown').toLowerCase();
      let resourceType = (ctx.input.resourceType || 'resource')
        .toLowerCase()
        .replace(/_/g, '_');

      return {
        type: `${resourceType}.${action}`,
        id: ctx.input.changeId,
        output: {
          changeId: ctx.input.changeId,
          accountId: ctx.input.accountId,
          accountName: ctx.input.accountName,
          accountDisplayName: ctx.input.accountDisplayName,
          propertyId: ctx.input.propertyId,
          propertyName: ctx.input.propertyName,
          propertyDisplayName: ctx.input.propertyDisplayName,
          changeTime: ctx.input.changeTime,
          actorEmail: ctx.input.actorEmail,
          actorType: ctx.input.actorType,
          resourceType: ctx.input.resourceType,
          action: ctx.input.action,
          resourceBeforeChange: ctx.input.resourceBeforeChange,
          resourceAfterChange: ctx.input.resourceAfterChange
        }
      };
    }
  })
  .build();
