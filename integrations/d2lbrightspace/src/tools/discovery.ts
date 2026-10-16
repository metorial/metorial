import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { optionalId, responseItems, richText } from '../lib/response';
import { spec } from '../spec';

let orgUnitId = z
  .string()
  .describe('Org unit ID. Call list_enrollments or list_org_units to discover IDs.');

export let getOrgUnit = SlateTool.create(spec, {
  key: 'get_org_unit',
  name: 'Get Org Unit',
  description:
    'Retrieve an organizational unit by an ID from list_org_units or list_enrollments, including its type and content path.',
  tags: { readOnly: true }
})
  .input(z.object({ orgUnitId }))
  .output(
    z.object({
      orgUnitId: z.string(),
      name: z.string().optional(),
      code: z.string().optional(),
      typeId: z.string().optional(),
      typeName: z.string().optional(),
      path: z.string().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await createClient(ctx.config, ctx.auth).getOrgUnit(ctx.input.orgUnitId);
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        orgUnitId: String(raw.Identifier),
        name: raw.Name ?? undefined,
        code: raw.Code ?? undefined,
        typeId: optionalId(raw.Type?.Id),
        typeName: raw.Type?.Name ?? undefined,
        path: raw.Path ?? undefined,
        raw
      }
    };
  })
  .build();

export let listOrgUnitTypes = SlateTool.create(spec, {
  key: 'list_org_unit_types',
  name: 'List Org Unit Types',
  description:
    'Discover organizational unit type IDs and names to filter list_org_units, such as courses, semesters, and departments.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      types: z.array(
        z.object({
          typeId: z.string(),
          name: z.string().optional(),
          code: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.config, ctx.auth).getOrgUnitTypes();
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        types: responseItems(result).map((type: any) => ({
          typeId: String(type.Id),
          name: type.Name ?? undefined,
          code: type.Code ?? undefined
        }))
      }
    };
  })
  .build();

export let getContentTopic = SlateTool.create(spec, {
  key: 'get_content_topic',
  name: 'Get Content Topic',
  description:
    'Retrieve a course content topic, its type, URL, dates, and visibility. Use list_content_modules with a moduleId to discover topic IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId,
      topicId: z
        .string()
        .describe(
          'Topic ID from the topicId or moduleId field of a contentType 1 entry in list_content_modules.'
        )
    })
  )
  .output(
    z.object({
      topicId: z.string(),
      title: z.string().optional(),
      topicType: z.number().optional(),
      url: z.string().optional(),
      description: z.string().optional(),
      parentModuleId: z.string().optional(),
      isHidden: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      dueDate: z.string().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await createClient(ctx.config, ctx.auth).getContentTopic(
      ctx.input.orgUnitId,
      ctx.input.topicId
    );
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        topicId: String(raw.Id),
        title: raw.Title ?? undefined,
        topicType: raw.TopicType ?? undefined,
        url: raw.Url ?? undefined,
        description: richText(raw.Description),
        parentModuleId: optionalId(raw.ParentModuleId),
        isHidden: raw.IsHidden ?? undefined,
        startDate: raw.StartDate ?? undefined,
        endDate: raw.EndDate ?? undefined,
        dueDate: raw.DueDate ?? undefined,
        raw
      }
    };
  })
  .build();

export let getAnnouncement = SlateTool.create(spec, {
  key: 'get_announcement',
  name: 'Get Announcement',
  description:
    'Retrieve an announcement by an ID from list_announcements, including its full body and publication settings.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId,
      newsItemId: z.string().describe('Announcement ID from list_announcements.')
    })
  )
  .output(
    z.object({
      newsItemId: z.string(),
      title: z.string().optional(),
      body: z.string().optional(),
      isPublished: z.boolean().optional(),
      isPinned: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      createdByUserId: z.string().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await createClient(ctx.config, ctx.auth).getNewsItem(
      ctx.input.orgUnitId,
      ctx.input.newsItemId
    );
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        newsItemId: String(raw.Id),
        title: raw.Title ?? undefined,
        body: richText(raw.Body),
        isPublished: raw.IsPublished ?? undefined,
        isPinned: raw.IsPinned ?? undefined,
        startDate: raw.StartDate ?? undefined,
        endDate: raw.EndDate ?? undefined,
        createdByUserId: optionalId(raw.CreatedBy),
        raw
      }
    };
  })
  .build();

export let getCalendarEvent = SlateTool.create(spec, {
  key: 'get_calendar_event',
  name: 'Get Calendar Event',
  description:
    'Retrieve a calendar event by an ID from list_calendar_events, including its recurrence, visibility, location, and associated activity.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId,
      calendarEventId: z.string().describe('Event ID from list_calendar_events.')
    })
  )
  .output(
    z.object({
      calendarEventId: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      startDateTime: z.string().optional(),
      endDateTime: z.string().optional(),
      isAllDayEvent: z.boolean().optional(),
      startDay: z.string().optional(),
      endDay: z.string().optional(),
      locationName: z.string().optional(),
      url: z.string().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await createClient(ctx.config, ctx.auth).getCalendarEvent(
      ctx.input.orgUnitId,
      ctx.input.calendarEventId
    );
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        calendarEventId: String(raw.CalendarEventId),
        title: raw.Title ?? undefined,
        description: raw.Description ?? undefined,
        startDateTime: raw.StartDateTime ?? undefined,
        endDateTime: raw.EndDateTime ?? undefined,
        isAllDayEvent: raw.IsAllDayEvent ?? undefined,
        startDay: raw.StartDay ?? undefined,
        endDay: raw.EndDay ?? undefined,
        locationName: raw.LocationName ?? undefined,
        url: raw.CalendarEventViewUrl ?? undefined,
        raw
      }
    };
  })
  .build();

export let listAwardAssociations = SlateTool.create(spec, {
  key: 'list_award_associations',
  name: 'List Award Associations',
  description:
    'Discover awards associated with an org unit before issue_award. Returns award IDs, names, association IDs, and criteria.',
  tags: { readOnly: true }
})
  .input(z.object({ orgUnitId }))
  .output(
    z.object({
      associations: z.array(
        z.object({
          awardId: z.string(),
          associationId: z.string().optional(),
          title: z.string().optional(),
          criteria: z.string().optional(),
          raw: z.unknown()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.config, ctx.auth).listOrgUnitAssociations(
      ctx.input.orgUnitId
    );
    return {
      message: 'Retrieved Brightspace resource details.',
      output: {
        associations: responseItems(result).map((raw: any) => ({
          awardId: String(raw.Award?.AwardId),
          associationId: optionalId(raw.AssociationId),
          title: raw.Award?.Title ?? undefined,
          criteria: raw.Award?.Criteria ?? undefined,
          raw
        }))
      }
    };
  })
  .build();
