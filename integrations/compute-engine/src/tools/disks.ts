import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let DISK_BASIC_FIELDS =
  'name,id,description,creationTimestamp,sizeGb,type,status,lastAttachTimestamp,lastDetachTimestamp';
let DISK_LIST_FIELDS = `items(${DISK_BASIC_FIELDS}),nextPageToken`;
let DISK_PERFORMANCE_FIELDS =
  'type,sizeGb,provisionedIops,provisionedThroughput,physicalBlockSizeBytes,storagePool,accessMode';
let SNAPSHOT_LIST_FIELDS =
  'items(name,id,status,creationTimestamp,diskSizeGb,storageBytes,sourceDisk,sourceDiskId),nextPageToken';

export interface DiskBasicInfo {
  name: string;
  id: string;
  description?: string;
  creationTimestamp: string;
  sizeGb: string;
  type: string;
  status: string;
  lastAttachTimestamp?: string;
  lastDetachTimestamp?: string;
}

export interface DiskPerformanceConfig {
  type: string;
  sizeGb: string;
  provisionedIops?: string;
  provisionedThroughput?: string;
  physicalBlockSizeBytes?: string;
  storagePool?: string;
  accessMode?: string;
}

export interface SnapshotBasicInfo {
  name: string;
  id: string;
  status: string;
  creationTimestamp: string;
  diskSizeGb?: string;
  storageBytes?: string;
  sourceDisk?: string;
  sourceDiskId?: string;
}

type DiskListResponse = {
  items?: DiskBasicInfo[];
  nextPageToken?: string;
};

type SnapshotListResponse = {
  items?: SnapshotBasicInfo[];
  nextPageToken?: string;
};

let diskBasicInfoSchema = z.object({
  name: z.string().describe('Disk name'),
  id: z.string().describe('Compute Engine disk ID'),
  description: z.string().optional().describe('Disk description'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  sizeGb: z.string().describe('Disk size in GB'),
  type: z.string().describe('Disk type resource URL'),
  status: z.string().describe('Current disk status'),
  lastAttachTimestamp: z.string().optional().describe('Last attach timestamp'),
  lastDetachTimestamp: z.string().optional().describe('Last detach timestamp')
});

let diskPerformanceConfigSchema = z.object({
  type: z.string().describe('Disk type resource URL'),
  sizeGb: z.string().describe('Disk size in GB'),
  provisionedIops: z.string().optional().describe('Provisioned I/O operations per second'),
  provisionedThroughput: z
    .string()
    .optional()
    .describe('Provisioned throughput in MB per second'),
  physicalBlockSizeBytes: z.string().optional().describe('Physical block size in bytes'),
  storagePool: z.string().optional().describe('Storage pool resource URL'),
  accessMode: z.string().optional().describe('Disk access mode')
});

let snapshotBasicInfoSchema = z.object({
  name: z.string().describe('Snapshot name'),
  id: z.string().describe('Compute Engine snapshot ID'),
  status: z.string().describe('Current snapshot status'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  diskSizeGb: z.string().optional().describe('Source disk size in GB'),
  storageBytes: z.string().optional().describe('Storage bytes consumed by the snapshot'),
  sourceDisk: z.string().optional().describe('Source disk resource URL'),
  sourceDiskId: z.string().optional().describe('Source disk ID')
});

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

let diskNameInput = z.string().trim().min(1).describe('Compute Engine disk name');

let filterInput = z
  .string()
  .optional()
  .describe(
    "Compute Engine list filter expression, such as status = READY or name eq '^web-.*'"
  );

let createClient = (ctx: {
  auth: { token: string };
  config: { projectId: string; defaultZone?: string; defaultRegion?: string };
}) =>
  new ComputeEngineClient({
    token: ctx.auth.token,
    projectId: ctx.config.projectId,
    defaultZone: ctx.config.defaultZone,
    defaultRegion: ctx.config.defaultRegion
  });

let disksPath = (client: ComputeEngineClient, zone: string, name?: string) =>
  client.projectPath(
    name
      ? `zones/${encodeURIComponent(zone)}/disks/${encodeURIComponent(name)}`
      : `zones/${encodeURIComponent(zone)}/disks`
  );

let mapDiskBasicInfo = (disk: DiskBasicInfo) => ({
  name: disk.name,
  id: disk.id,
  description: disk.description,
  createTime: disk.creationTimestamp,
  sizeGb: disk.sizeGb,
  type: disk.type,
  status: disk.status,
  lastAttachTimestamp: disk.lastAttachTimestamp,
  lastDetachTimestamp: disk.lastDetachTimestamp
});

let mapSnapshotBasicInfo = (snapshot: SnapshotBasicInfo) => ({
  name: snapshot.name,
  id: snapshot.id,
  status: snapshot.status,
  createTime: snapshot.creationTimestamp,
  diskSizeGb: snapshot.diskSizeGb,
  storageBytes: snapshot.storageBytes,
  sourceDisk: snapshot.sourceDisk,
  sourceDiskId: snapshot.sourceDiskId
});

export let getDiskBasicInfo = SlateTool.create(spec, {
  name: 'Get Disk Basic Info',
  key: 'get_disk_basic_info',
  description:
    'Get a Compute Engine disk name, ID, description, size, type, status, and attach or detach timestamps.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: diskNameInput }))
  .output(diskBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let disk = await client.request<DiskBasicInfo>('get disk basic info', {
      method: 'get',
      path: disksPath(client, zone, ctx.input.name),
      params: { fields: DISK_BASIC_FIELDS }
    });

    return {
      output: mapDiskBasicInfo(disk),
      message: `Retrieved basic information for disk **${disk.name}** in **${zone}**.`
    };
  })
  .build();

export let getDiskPerformanceConfig = SlateTool.create(spec, {
  name: 'Get Disk Performance Config',
  key: 'get_disk_performance_config',
  description:
    'Get the type, size, provisioned IOPS, provisioned throughput, physical block size, storage pool, and access mode of a Compute Engine disk.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: diskNameInput }))
  .output(diskPerformanceConfigSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let performance = await client.request<DiskPerformanceConfig>(
      'get disk performance config',
      {
        method: 'get',
        path: disksPath(client, zone, ctx.input.name),
        params: { fields: DISK_PERFORMANCE_FIELDS }
      }
    );

    return {
      output: performance,
      message: `Retrieved performance configuration for disk **${ctx.input.name}** in **${zone}**.`
    };
  })
  .build();

export let listDisks = SlateTool.create(spec, {
  name: 'List Disks',
  key: 'list_disks',
  description:
    'List Compute Engine disks in a zone with basic identity, size, type, status, and attachment timestamps.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      zone: zoneInput,
      filter: filterInput,
      pageSize: z
        .number()
        .int()
        .min(0)
        .max(500)
        .optional()
        .describe('Maximum disks to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      disks: z.array(diskBasicInfoSchema).describe('Disks found in the zone'),
      nextPageToken: z.string().optional().describe('Token for the next page of disks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<DiskListResponse>('list disks', {
      method: 'get',
      path: disksPath(client, zone),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: DISK_LIST_FIELDS
      })
    });
    let disks = (response.items ?? []).map(mapDiskBasicInfo);

    return {
      output: {
        disks,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${disks.length}** disk(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();

export let listSnapshots = SlateTool.create(spec, {
  name: 'List Snapshots',
  key: 'list_snapshots',
  description:
    'List global Compute Engine snapshots in the configured project with source and storage details.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      filter: filterInput,
      pageSize: z
        .number()
        .int()
        .min(0)
        .max(500)
        .optional()
        .describe('Maximum snapshots to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      snapshots: z.array(snapshotBasicInfoSchema).describe('Snapshots found in the project'),
      nextPageToken: z.string().optional().describe('Token for the next page of snapshots')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.request<SnapshotListResponse>('list snapshots', {
      method: 'get',
      path: client.projectPath('global/snapshots'),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: SNAPSHOT_LIST_FIELDS
      })
    });
    let snapshots = (response.items ?? []).map(mapSnapshotBasicInfo);

    return {
      output: {
        snapshots,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${snapshots.length}** snapshot(s) in project **${client.projectId}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
