import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

let segmentSchema = z.object({
  segmentId: z.string().describe('Unique identifier for the segment'),
  name: z.string().describe('Name of the segment'),
  description: z.string().optional().describe('Description of the segment')
});

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all user segments in your Appcues account. Segments are used to group users for targeted experience delivery.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      segments: z.array(segmentSchema).describe('List of segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let segments = await client.listSegments();
    let segmentList = Array.isArray(segments) ? segments : [];

    return {
      output: {
        segments: segmentList.map((s: any) => ({
          segmentId: s.id || '',
          name: s.name || '',
          description: s.description || undefined
        }))
      },
      message: `Found **${segmentList.length}** segments.`
    };
  })
  .build();

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Create a new user segment in Appcues. Segments can be populated with users later using the "Manage Segment Members" tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new segment'),
      description: z.string().optional().describe('Optional description of the segment')
    })
  )
  .output(segmentSchema)
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let segment = await client.createSegment(ctx.input.name, ctx.input.description);

    return {
      output: {
        segmentId: segment.id || '',
        name: segment.name || ctx.input.name,
        description: segment.description || undefined
      },
      message: `Created segment **${ctx.input.name}** with ID \`${segment.id}\`.`
    };
  })
  .build();

export let updateSegment = SlateTool.create(spec, {
  name: 'Update Segment',
  key: 'update_segment',
  description: `Update an existing segment's name or description in Appcues.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('The ID of the segment to update'),
      name: z.string().optional().describe('New name for the segment'),
      description: z.string().optional().describe('New description for the segment')
    })
  )
  .output(segmentSchema)
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let segment = await client.updateSegment(ctx.input.segmentId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        segmentId: segment.id || ctx.input.segmentId,
        name: segment.name || '',
        description: segment.description || undefined
      },
      message: `Updated segment \`${ctx.input.segmentId}\`.`
    };
  })
  .build();

export let deleteSegment = SlateTool.create(spec, {
  name: 'Delete Segment',
  key: 'delete_segment',
  description: `Delete a user segment from Appcues. This permanently removes the segment definition and its membership data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('The ID of the segment to delete')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('The ID of the deleted segment'),
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    await client.deleteSegment(ctx.input.segmentId);

    return {
      output: {
        segmentId: ctx.input.segmentId,
        success: true
      },
      message: `Deleted segment \`${ctx.input.segmentId}\`.`
    };
  })
  .build();

export let manageSegmentMembers = SlateTool.create(spec, {
  name: 'Manage Segment Members',
  key: 'manage_segment_members',
  description: `Add or remove user IDs from a segment in bulk. Membership changes are processed asynchronously. You can also export segment membership to retrieve a list of users in the segment.`,
  tags: {
    destructive: false
  },
  constraints: ['Membership changes are processed asynchronously']
})
  .input(
    z.object({
      segmentId: z.string().describe('The ID of the segment'),
      action: z
        .enum(['add', 'remove', 'export'])
        .describe('Whether to add users, remove users, or export membership'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to add or remove (required for add/remove actions)'),
      exportFormat: z
        .enum(['csv', 'json'])
        .optional()
        .describe('Format for membership export (default: json)'),
      exportPropertyNames: z
        .array(z.string())
        .optional()
        .describe('Property names to include in the export'),
      exportEmail: z.string().optional().describe('Email to send the export to')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('The segment ID'),
      action: z.string().describe('The action that was performed'),
      jobId: z.string().optional().describe('Async job ID for tracking the operation'),
      jobUrl: z.string().optional().describe('URL for tracking the job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let result: any;

    if (ctx.input.action === 'add') {
      if (!ctx.input.userIds || ctx.input.userIds.length === 0) {
        throw new Error('userIds is required for add action');
      }
      result = await client.addUsersToSegment(ctx.input.segmentId, ctx.input.userIds);
    } else if (ctx.input.action === 'remove') {
      if (!ctx.input.userIds || ctx.input.userIds.length === 0) {
        throw new Error('userIds is required for remove action');
      }
      result = await client.removeUsersFromSegment(ctx.input.segmentId, ctx.input.userIds);
    } else {
      result = await client.exportSegmentMembership(ctx.input.segmentId, {
        format: ctx.input.exportFormat,
        propertyNames: ctx.input.exportPropertyNames,
        email: ctx.input.exportEmail
      });
    }

    let actionLabel =
      ctx.input.action === 'add'
        ? 'Added users to'
        : ctx.input.action === 'remove'
          ? 'Removed users from'
          : 'Exported membership of';

    return {
      output: {
        segmentId: ctx.input.segmentId,
        action: ctx.input.action,
        jobId: result?.job_id || undefined,
        jobUrl: result?.job_url || undefined
      },
      message: `${actionLabel} segment \`${ctx.input.segmentId}\`.${result?.job_id ? ` Job ID: \`${result.job_id}\`` : ''}`
    };
  })
  .build();
