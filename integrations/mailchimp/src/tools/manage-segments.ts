import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSegmentsTool = SlateTool.create(spec, {
  name: 'Manage Segments',
  key: 'manage_segments',
  description: `List, create, update, or delete segments within an audience. Segments are used to target specific groups of contacts in campaigns. Supports both static and saved segments.`,
  instructions: [
    'To list segments, provide only the listId.',
    'To create a segment, provide listId, name, and optionally conditions.',
    'To update, provide listId, segmentId, and the fields to change.',
    'To delete, provide listId, segmentId, and set delete to true.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      segmentId: z.string().optional().describe('Segment ID (required for update/delete)'),
      delete: z.boolean().optional().describe('Set to true to delete the segment'),
      name: z.string().optional().describe('Segment name'),
      staticSegmentEmails: z
        .array(z.string())
        .optional()
        .describe('Email addresses to include in a static segment'),
      conditions: z
        .array(
          z.object({
            conditionType: z.string().describe('Condition type'),
            field: z.string().describe('Field to evaluate'),
            op: z.string().describe('Operator (e.g., "is", "contains", "greater")'),
            value: z.string().describe('Value to compare')
          })
        )
        .optional()
        .describe('Conditions for a saved segment'),
      matchType: z
        .enum(['any', 'all'])
        .optional()
        .describe('Match type for conditions (default "all")'),
      count: z.number().optional().describe('Number of segments to return when listing'),
      offset: z.number().optional().describe('Number of segments to skip when listing')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.number(),
            name: z.string(),
            type: z.string(),
            memberCount: z.number(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      segment: z
        .object({
          segmentId: z.number(),
          name: z.string(),
          type: z.string(),
          memberCount: z.number()
        })
        .optional(),
      deleted: z.boolean().optional(),
      totalItems: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    if (ctx.input.delete && ctx.input.segmentId) {
      await client.deleteSegment(ctx.input.listId, ctx.input.segmentId);
      return {
        output: { deleted: true },
        message: `Segment **${ctx.input.segmentId}** has been deleted.`
      };
    }

    if (ctx.input.delete && !ctx.input.segmentId) {
      throw mailchimpServiceError('segmentId is required to delete a segment.');
    }

    if (ctx.input.segmentId && !ctx.input.name) {
      let result = await client.getSegment(ctx.input.listId, ctx.input.segmentId);
      return {
        output: {
          segment: {
            segmentId: result.id,
            name: result.name,
            type: result.type,
            memberCount: result.member_count ?? 0
          }
        },
        message: `Retrieved segment **${result.name}**.`
      };
    }

    if (ctx.input.segmentId && ctx.input.name) {
      let updateData: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.staticSegmentEmails) {
        updateData.static_segment = ctx.input.staticSegmentEmails;
      }
      if (ctx.input.conditions) {
        updateData.options = {
          match: ctx.input.matchType ?? 'all',
          conditions: ctx.input.conditions.map(c => ({
            condition_type: c.conditionType,
            field: c.field,
            op: c.op,
            value: c.value
          }))
        };
      }

      let result = await client.updateSegment(
        ctx.input.listId,
        ctx.input.segmentId,
        updateData
      );
      return {
        output: {
          segment: {
            segmentId: result.id,
            name: result.name,
            type: result.type,
            memberCount: result.member_count ?? 0
          }
        },
        message: `Segment **${result.name}** has been updated.`
      };
    }

    if (ctx.input.name && !ctx.input.segmentId) {
      let createData: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.staticSegmentEmails) {
        createData.static_segment = ctx.input.staticSegmentEmails;
      }
      if (ctx.input.conditions) {
        createData.options = {
          match: ctx.input.matchType ?? 'all',
          conditions: ctx.input.conditions.map(c => ({
            condition_type: c.conditionType,
            field: c.field,
            op: c.op,
            value: c.value
          }))
        };
      }

      let result = await client.createSegment(ctx.input.listId, createData);
      return {
        output: {
          segment: {
            segmentId: result.id,
            name: result.name,
            type: result.type,
            memberCount: result.member_count ?? 0
          }
        },
        message: `Segment **${result.name}** (${result.id}) has been created.`
      };
    }

    // List segments
    let result = await client.getSegments(ctx.input.listId, {
      count: ctx.input.count,
      offset: ctx.input.offset
    });

    let segments = (result.segments ?? []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      type: s.type,
      memberCount: s.member_count ?? 0,
      createdAt: s.created_at,
      updatedAt: s.updated_at
    }));

    return {
      output: {
        segments,
        totalItems: result.total_items ?? 0
      },
      message: `Found **${segments.length}** segment(s) out of ${result.total_items ?? 0} total in audience ${ctx.input.listId}.`
    };
  })
  .build();
