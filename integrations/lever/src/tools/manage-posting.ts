import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { id, invalid, type Row, row, text, writable } from '../lib/contracts';
import { spec } from '../spec';

export let managePostingTool = SlateTool.create(spec, {
  name: 'Manage Posting',
  key: 'manage_posting',
  description: `Create a new job posting or update an existing one. Supports setting posting text, categories (team, department, location, commitment), state, distribution channels and workplace type. Legacy salaryRange is unsupported by the Data API.`,
  instructions: [
    'To create a new posting, omit postingId.',
    'To update an existing posting, provide postingId.',
    'Provide performAsUserId from list_users for all writes. The API bypasses posting approval workflows.'
  ]
})
  .input(
    z.object({
      performAsUserId: z
        .string()
        .optional()
        .describe(
          'Acting user ID required for this write. Call list_users to discover authorized users.'
        ),
      postingId: z
        .string()
        .optional()
        .describe('ID of posting to update. Omit to create new.'),
      text: z.string().optional().describe('Job title/posting text'),
      state: z
        .enum(['published', 'internal', 'closed', 'draft', 'pending'])
        .optional()
        .describe('Posting state'),
      distributionChannels: z
        .array(z.enum(['public', 'internal']))
        .optional()
        .describe('Distribution channels'),
      categories: z
        .object({
          team: z.string().optional().describe('Team name'),
          department: z.string().optional().describe('Department name'),
          location: z.string().optional().describe('Location name'),
          commitment: z.string().optional().describe('Commitment type (e.g., Full-time)')
        })
        .optional()
        .describe('Posting categories'),
      content: z
        .object({
          description: z.string().optional().describe('HTML job description'),
          descriptionPlain: z.string().optional().describe('Plain text job description'),
          lists: z
            .array(
              z.object({
                text: z.string().describe('List header'),
                content: z.string().describe('HTML list content')
              })
            )
            .optional()
            .describe('Additional content sections (requirements, etc.)'),
          closing: z.string().optional().describe('HTML closing content'),
          closingPlain: z.string().optional().describe('Plain text closing content')
        })
        .optional()
        .describe('Posting content'),
      salaryRange: z
        .object({
          min: z.number().optional(),
          max: z.number().optional(),
          currency: z.string().optional(),
          interval: z.enum(['per-year-salary', 'per-hour-wage', 'one-time']).optional()
        })
        .optional()
        .describe('Salary range information'),
      workplaceType: z
        .enum(['unspecified', 'on-site', 'remote', 'hybrid'])
        .optional()
        .describe('Workplace type'),
      ownerId: z.string().optional().describe('User ID of posting owner'),
      reqId: z.string().optional().describe('Requisition ID to associate')
    })
  )
  .output(
    z.object({
      postingId: z.string().describe('ID of the created or updated posting'),
      posting: z.any().describe('The full posting object')
    })
  )
  .handleInvocation(async ctx => {
    const actor = id(ctx.input.performAsUserId, 'Acting user ID; discover it with list_users');
    if (ctx.input.salaryRange !== undefined)
      invalid(
        'The authenticated Data API does not document salaryRange writes. Edit salary details in Lever.'
      );
    const body: Row = {};
    if (ctx.input.text !== undefined) body.text = text(ctx.input.text, 'Posting title');
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.distributionChannels !== undefined)
      body.distributionChannels = ctx.input.distributionChannels;
    if (ctx.input.ownerId !== undefined) body.owner = id(ctx.input.ownerId);
    const client = new Client(ctx.auth);
    const postingId =
      ctx.input.postingId === undefined
        ? undefined
        : id(ctx.input.postingId, 'Posting ID; discover it with list_postings');
    const before =
      postingId === undefined ? undefined : (await client.getPosting(postingId)).data;
    if (ctx.input.reqId !== undefined) {
      const requisition = (
        await client.getRequisition(
          id(ctx.input.reqId, 'Requisition ID; discover it with list_resources')
        )
      ).data;
      body.requisitionCodes = [text(requisition.requisitionCode, 'Returned requisition code')];
    }
    if (ctx.input.categories !== undefined) {
      const supplied = Object.fromEntries(
        Object.entries(ctx.input.categories).map(([key, value]) => [
          key,
          value === undefined ? undefined : text(value, `Posting category ${key}`, true)
        ])
      );
      body.categories = {
        ...(before?.categories === undefined
          ? {}
          : writable(row(before.categories), [
              'team',
              'department',
              'location',
              'commitment',
              'locationDetails',
              'allLocations'
            ])),
        ...pickDefined(supplied)
      };
    }
    if (ctx.input.content !== undefined) {
      const content = ctx.input.content;
      const html = (value: string) =>
        text(value, 'Posting content', true)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;')
          .replaceAll('\n', '<br>');
      body.content = {
        ...(before?.content === undefined
          ? {}
          : writable(row(before.content), ['descriptionHtml', 'lists', 'closingPostingHtml'])),
        ...pickDefined({
          descriptionHtml:
            content.description === undefined
              ? content.descriptionPlain === undefined
                ? undefined
                : html(content.descriptionPlain)
              : text(content.description, 'Posting description', true),
          closingPostingHtml:
            content.closing === undefined
              ? content.closingPlain === undefined
                ? undefined
                : html(content.closingPlain)
              : text(content.closing, 'Posting closing', true),
          lists: content.lists?.map(item => ({
            text: text(item.text, 'Content section title'),
            content: text(item.content, 'Content section HTML', true)
          }))
        })
      };
    }
    if (ctx.input.workplaceType !== undefined) {
      if (ctx.input.workplaceType === 'unspecified' && postingId !== undefined)
        invalid(
          'Lever cannot reset an established workplace type to unspecified. Edit the posting in Lever.'
        );
      if (ctx.input.workplaceType !== 'unspecified')
        body.workplaceType =
          ctx.input.workplaceType === 'on-site' ? 'onsite' : ctx.input.workplaceType;
    }
    if (postingId === undefined) {
      text(body.text, 'Posting title');
      const categories = row(body.categories);
      text(categories.team, 'Posting team');
      text(categories.location, 'Posting location');
      const result = await client.createPosting(body, actor);
      return {
        output: { postingId: result.data.id, posting: result.data },
        message: `Created posting ${result.data.id}.`
      };
    }
    if (!Object.keys(body).length) invalid('Provide at least one posting field to update.');
    const result = await client.updatePosting(postingId, body, actor, before);
    return {
      output: { postingId, posting: result.data },
      message: `Updated posting ${postingId}.`
    };
  })
  .build();
