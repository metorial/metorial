import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { UploadClient } from '../lib/upload-client';
import { spec } from '../spec';

let groupSummarySchema = z.object({
  groupId: z.string().describe('Group ID (UUID~N format)'),
  datetimeCreated: z.string().describe('ISO 8601 creation timestamp'),
  filesCount: z.number().describe('Number of files in the group'),
  cdnUrl: z.string().describe('CDN URL for the group')
});

export let listGroups = SlateTool.create(spec, {
  name: 'List File Groups',
  key: 'list_groups',
  description: `List file groups in your Uploadcare project. Groups are immutable collections of files identified by a UUID~N format.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of results per page (1-1000, default 100)'),
      ordering: z
        .enum(['datetime_created', '-datetime_created'])
        .optional()
        .describe('Sort order by creation date'),
      fromDatetime: z.string().optional().describe('ISO 8601 datetime to start listing from')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of groups'),
      hasMore: z.boolean().describe('Whether there are more results available'),
      groups: z.array(groupSummarySchema).describe('List of file groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.listGroups({
      limit: ctx.input.limit,
      ordering: ctx.input.ordering,
      from: ctx.input.fromDatetime
    });

    let groups = result.results.map(g => ({
      groupId: g.id,
      datetimeCreated: g.datetime_created,
      filesCount: g.files_count,
      cdnUrl: g.cdn_url
    }));

    return {
      output: {
        total: result.total,
        hasMore: result.next !== null,
        groups
      },
      message: `Found **${result.total}** groups, returning **${groups.length}**.`
    };
  })
  .build();

export let getGroup = SlateTool.create(spec, {
  name: 'Get File Group',
  key: 'get_group',
  description: `Retrieve detailed information about a file group, including its files.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('Group ID in UUID~N format')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID'),
      datetimeCreated: z.string().describe('ISO 8601 creation timestamp'),
      datetimeStored: z
        .string()
        .nullable()
        .describe('ISO 8601 store timestamp, null if not stored'),
      filesCount: z.number().describe('Number of files in the group'),
      cdnUrl: z.string().describe('CDN URL for the group'),
      files: z
        .array(
          z.object({
            fileId: z.string().describe('UUID of the file'),
            originalFilename: z.string().describe('Original filename'),
            size: z.number().describe('File size in bytes'),
            mimeType: z.string().describe('MIME type'),
            isImage: z.boolean().describe('Whether the file is an image')
          })
        )
        .describe('Files in the group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let group = await client.getGroup(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        datetimeCreated: group.datetime_created,
        datetimeStored: group.datetime_stored,
        filesCount: group.files_count,
        cdnUrl: group.cdn_url,
        files: group.files.map(f => ({
          fileId: f.uuid,
          originalFilename: f.original_filename,
          size: f.size,
          mimeType: f.mime_type,
          isImage: f.is_image
        }))
      },
      message: `Group **${group.id}** has **${group.files_count}** files.`
    };
  })
  .build();

export let createGroup = SlateTool.create(spec, {
  name: 'Create File Group',
  key: 'create_group',
  description: `Create an immutable group of files. Groups cannot be modified after creation — to change the file list, create a new group. File IDs can optionally include CDN transformation operations.`
})
  .input(
    z.object({
      fileIds: z
        .array(z.string())
        .min(1)
        .describe('Array of file UUIDs (optionally with CDN operations appended)')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID in UUID~N format'),
      filesCount: z.number().describe('Number of files in the group'),
      cdnUrl: z.string().describe('CDN URL for the group')
    })
  )
  .handleInvocation(async ctx => {
    let uploadClient = new UploadClient(ctx.auth.publicKey);
    let group = await uploadClient.createGroup(ctx.input.fileIds);

    return {
      output: {
        groupId: group.id,
        filesCount: group.files_count,
        cdnUrl: group.cdn_url
      },
      message: `Created group **${group.id}** with **${group.files_count}** files.`
    };
  })
  .build();

export let storeGroup = SlateTool.create(spec, {
  name: 'Store File Group',
  key: 'store_group',
  description: `Permanently store all files within a file group. This prevents the files from being automatically deleted after 24 hours.`
})
  .input(
    z.object({
      groupId: z.string().describe('Group ID in UUID~N format')
    })
  )
  .output(
    z.object({
      groupId: z.string().describe('Group ID'),
      filesCount: z.number().describe('Number of files stored')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let group = await client.storeGroup(ctx.input.groupId);

    return {
      output: {
        groupId: group.id,
        filesCount: group.files_count
      },
      message: `Stored all **${group.files_count}** files in group **${group.id}**.`
    };
  })
  .build();
