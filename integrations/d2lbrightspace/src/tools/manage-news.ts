import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listAnnouncements = SlateTool.create(spec, {
  name: 'List Announcements',
  key: 'list_announcements',
  description: `List all news items (announcements) in a course or org unit. Returns title, body, dates, and publication status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID')
    })
  )
  .output(
    z.object({
      announcements: z
        .array(
          z.object({
            newsItemId: z.string().describe('News item ID'),
            title: z.string().optional().describe('Announcement title'),
            body: z.string().optional().describe('Announcement body text'),
            createdDate: z.string().optional().describe('Date created'),
            startDate: z.string().optional().describe('Start date (when visible)'),
            endDate: z.string().optional().describe('End date (when hidden)'),
            isPublished: z.boolean().optional().describe('Whether published'),
            isPinned: z.boolean().optional().describe('Whether pinned'),
            createdByName: z.string().optional().describe('Author name')
          })
        )
        .describe('List of announcements')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listNews(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : [];
    let announcements = items.map((n: any) => ({
      newsItemId: String(n.Id),
      title: n.Title,
      body: n.Body?.Text || n.Body?.Content || n.Body?.Html,
      createdDate: n.CreatedDate,
      startDate: n.StartDate,
      endDate: n.EndDate,
      isPublished: n.IsPublished,
      isPinned: n.IsPinned,
      createdByName: n.CreatedBy
    }));

    return {
      output: { announcements },
      message: `Found **${announcements.length}** announcement(s) in org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();

export let createAnnouncement = SlateTool.create(spec, {
  name: 'Create Announcement',
  key: 'create_announcement',
  description: `Create a new news item (announcement) in a course or org unit. Supports setting title, body, publication status, and date visibility.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      title: z.string().describe('Announcement title'),
      body: z.string().describe('Announcement body (HTML supported)'),
      isPublished: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to publish immediately'),
      isPinned: z.boolean().optional().describe('Whether to pin the announcement'),
      startDate: z
        .string()
        .optional()
        .describe('When the announcement becomes visible (ISO 8601)'),
      endDate: z.string().optional().describe('When the announcement expires (ISO 8601)'),
      isGlobal: z.boolean().optional().describe('Whether this is a global announcement'),
      showAuthorInfo: z.boolean().optional().describe('Show author information')
    })
  )
  .output(
    z.object({
      newsItemId: z.string().describe('New announcement ID'),
      title: z.string().describe('Announcement title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let newsData: any = {
      Title: ctx.input.title,
      Body: { Content: ctx.input.body, Type: 'Html' },
      IsPublished: ctx.input.isPublished ?? true
    };

    if (ctx.input.isPinned !== undefined) newsData.IsPinned = ctx.input.isPinned;
    if (ctx.input.startDate) newsData.StartDate = ctx.input.startDate;
    if (ctx.input.endDate) newsData.EndDate = ctx.input.endDate;
    if (ctx.input.isGlobal !== undefined) newsData.IsGlobal = ctx.input.isGlobal;
    if (ctx.input.showAuthorInfo !== undefined)
      newsData.IsAuthorInfoShown = ctx.input.showAuthorInfo;

    let result = await client.createNewsItem(ctx.input.orgUnitId, newsData);

    return {
      output: {
        newsItemId: String(result.Id),
        title: result.Title
      },
      message: `Created announcement **${result.Title}** (ID: ${result.Id}).`
    };
  })
  .build();

export let updateAnnouncement = SlateTool.create(spec, {
  name: 'Update Announcement',
  key: 'update_announcement',
  description: `Update an existing news item (announcement) in a course or org unit. Only provide the fields you want to change.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      newsItemId: z.string().describe('Announcement ID to update'),
      title: z.string().optional().describe('Updated title'),
      body: z.string().optional().describe('Updated body (HTML supported)'),
      isPublished: z.boolean().optional().describe('Updated publication status'),
      isPinned: z.boolean().optional().describe('Updated pinned status'),
      startDate: z.string().optional().describe('Updated start date (ISO 8601)'),
      endDate: z.string().optional().describe('Updated end date (ISO 8601)')
    })
  )
  .output(
    z.object({
      newsItemId: z.string().describe('Updated announcement ID'),
      title: z.string().optional().describe('Updated title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};
    if (ctx.input.title !== undefined) updateData.Title = ctx.input.title;
    if (ctx.input.body !== undefined)
      updateData.Body = { Content: ctx.input.body, Type: 'Html' };
    if (ctx.input.isPublished !== undefined) updateData.IsPublished = ctx.input.isPublished;
    if (ctx.input.isPinned !== undefined) updateData.IsPinned = ctx.input.isPinned;
    if (ctx.input.startDate !== undefined) updateData.StartDate = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) updateData.EndDate = ctx.input.endDate;

    let result = await client.updateNewsItem(
      ctx.input.orgUnitId,
      ctx.input.newsItemId,
      updateData
    );

    return {
      output: {
        newsItemId: String(result.Id),
        title: result.Title
      },
      message: `Updated announcement **${result.Title}** (ID: ${result.Id}).`
    };
  })
  .build();

export let deleteAnnouncement = SlateTool.create(spec, {
  name: 'Delete Announcement',
  key: 'delete_announcement',
  description: `Delete a news item (announcement) from a course or org unit.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course or org unit ID'),
      newsItemId: z.string().describe('Announcement ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteNewsItem(ctx.input.orgUnitId, ctx.input.newsItemId);

    return {
      output: { success: true },
      message: `Deleted announcement (ID: ${ctx.input.newsItemId}).`
    };
  })
  .build();
