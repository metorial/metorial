import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getIdentity = SlateTool.create(spec, {
  name: 'Get Identity',
  key: 'get_identity',
  description:
    'Verify the authenticated API key name, permissions and organization dashboard.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ name: z.string(), roles: z.array(z.string()), dashboardUrl: z.string() }))
  .handleInvocation(async ctx => {
    const { identity } = await new Client(ctx.auth).getIdentity();
    return {
      output: {
        name: identity.name,
        roles: identity.roles,
        dashboardUrl: identity.dashboard_url
      },
      message: `Authenticated as ${identity.name}.`
    };
  })
  .build();

export const getSchedule = SlateTool.create(spec, {
  name: 'Get Schedule',
  key: 'get_schedule',
  description:
    'Retrieve an on-call schedule, including rotation and layer configuration needed to create an override.',
  tags: { readOnly: true }
})
  .input(z.object({ scheduleId: z.string().describe('Schedule ID from List Schedules') }))
  .output(
    z.object({
      scheduleId: z.string(),
      name: z.string(),
      timezone: z.string(),
      config: z.record(z.string(), z.unknown()).optional(),
      currentShifts: z.array(z.unknown()).optional(),
      nextShifts: z.array(z.unknown()).optional(),
      teamIds: z.array(z.string()).optional(),
      permalink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { schedule } = await new Client(ctx.auth).getSchedule(ctx.input.scheduleId);
    return {
      output: {
        scheduleId: schedule.id,
        name: schedule.name,
        timezone: schedule.timezone,
        config: schedule.config,
        currentShifts: schedule.current_shifts,
        nextShifts: schedule.next_shifts,
        teamIds: schedule.team_ids,
        permalink: schedule.permalink
      },
      message: `Retrieved schedule ${schedule.name}.`
    };
  })
  .build();

export const deleteScheduleOverride = SlateTool.create(spec, {
  name: 'Delete Schedule Override',
  key: 'delete_schedule_override',
  description:
    'Remove an on-call override and restore the underlying scheduled coverage. This can change who is paged.',
  tags: { destructive: true }
})
  .input(
    z.object({ overrideId: z.string().describe('ID returned when creating the override') })
  )
  .output(z.object({ overrideId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new Client(ctx.auth).deleteScheduleOverride(ctx.input.overrideId);
    return {
      output: { overrideId: ctx.input.overrideId, deleted: true },
      message: 'Removed the schedule override.'
    };
  })
  .build();

export const getCatalogEntry = SlateTool.create(spec, {
  name: 'Get Catalog Entry',
  key: 'get_catalog_entry',
  description: 'Read a catalog entry, its type, aliases, attributes and archive state.',
  tags: { readOnly: true }
})
  .input(z.object({ catalogEntryId: z.string().describe('Catalog entry ID') }))
  .output(
    z.object({
      catalogEntryId: z.string(),
      catalogTypeId: z.string(),
      name: z.string(),
      externalId: z.string().optional(),
      aliases: z.array(z.string()),
      attributeValues: z.record(z.string(), z.unknown()),
      createdAt: z.string(),
      updatedAt: z.string(),
      archivedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { catalog_entry: entry } = await new Client(ctx.auth).getCatalogEntry(
      ctx.input.catalogEntryId
    );
    return {
      output: {
        catalogEntryId: entry.id,
        catalogTypeId: entry.catalog_type_id,
        name: entry.name,
        externalId: entry.external_id,
        aliases: entry.aliases,
        attributeValues: entry.attribute_values,
        createdAt: entry.created_at,
        updatedAt: entry.updated_at,
        archivedAt: entry.archived_at
      },
      message: `Retrieved catalog entry ${entry.name}.`
    };
  })
  .build();

export const listStatusPages = SlateTool.create(spec, {
  name: 'List Status Pages',
  key: 'list_status_pages',
  description:
    'Discover status page IDs, names and public URLs before publishing an incident.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().int().min(1).max(250).optional(),
      after: z.string().optional().describe('Cursor from the previous response')
    })
  )
  .output(
    z.object({
      statusPages: z.array(
        z.object({
          statusPageId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          publicUrl: z.string().optional()
        })
      ),
      nextCursor: z.string().optional(),
      returnedCount: z.number().int()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth).listStatusPages(ctx.input);
    const statusPages = result.status_pages.map(page => ({
      statusPageId: page.id,
      name: page.name,
      description: page.description,
      publicUrl: page.public_url
    }));
    return {
      output: {
        statusPages,
        nextCursor: result.pagination_meta?.after,
        returnedCount: statusPages.length
      },
      message: `Found ${statusPages.length} status pages.`
    };
  })
  .build();

export const getStatusPageIncident = SlateTool.create(spec, {
  name: 'Get Status Page Incident',
  key: 'get_status_page_incident',
  description:
    'Read a published status page incident, its current status, updates and component impacts.',
  tags: { readOnly: true }
})
  .input(z.object({ statusPageIncidentId: z.string() }))
  .output(
    z.object({
      statusPageIncidentId: z.string(),
      statusPageId: z.string(),
      name: z.string(),
      incidentStatus: z.string(),
      publishedAt: z.string(),
      updates: z.array(z.unknown()),
      componentImpacts: z.array(z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    const { status_page_incident: incident } = await new Client(
      ctx.auth
    ).getStatusPageIncident(ctx.input.statusPageIncidentId);
    return {
      output: {
        statusPageIncidentId: incident.id,
        statusPageId: incident.status_page_id,
        name: incident.name,
        incidentStatus: incident.incident_status,
        publishedAt: incident.published_at,
        updates: incident.updates,
        componentImpacts: incident.component_impacts
      },
      message: `Retrieved status page incident ${incident.name}.`
    };
  })
  .build();

export const listAlertSources = SlateTool.create(spec, {
  name: 'List Alert Sources',
  key: 'list_alert_sources',
  description:
    'Discover configured alert sources and HTTP configuration IDs. Secrets are excluded; sending events requires the source secret in authentication.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      alertSources: z.array(
        z.object({
          alertSourceId: z.string(),
          name: z.string(),
          sourceType: z.string(),
          alertSourceConfigId: z.string().optional()
        })
      ),
      returnedCount: z.number().int()
    })
  )
  .handleInvocation(async ctx => {
    const { alert_sources } = await new Client(ctx.auth).listAlertSources();
    const alertSources = alert_sources.map(source => {
      let configId: string | undefined;
      if (source.alert_events_url) {
        try {
          const url = new URL(source.alert_events_url);
          if (url.origin === 'https://api.incident.io')
            configId = url.pathname.match(/^\/v2\/alert_events\/http\/([^/]+)$/)?.[1];
        } catch {
          /* Sources without a usable HTTP endpoint have no configuration ID. */
        }
      }
      return {
        alertSourceId: source.id,
        name: source.name,
        sourceType: source.source_type,
        alertSourceConfigId: configId
      };
    });
    return {
      output: { alertSources, returnedCount: alertSources.length },
      message: `Found ${alertSources.length} alert sources.`
    };
  })
  .build();
