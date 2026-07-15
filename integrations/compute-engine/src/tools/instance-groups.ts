import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let INSTANCE_GROUP_MANAGER_BASIC_FIELDS =
  'name,id,creationTimestamp,instanceTemplate,baseInstanceName,targetSize,targetStoppedSize,targetSuspendedSize,listManagedInstancesResults,status';
let INSTANCE_GROUP_MANAGER_LIST_FIELDS = `items(${INSTANCE_GROUP_MANAGER_BASIC_FIELDS}),nextPageToken`;
let MANAGED_INSTANCE_FIELDS =
  'name,instance,id,instanceStatus,version(name,instanceTemplate),currentAction';
let MANAGED_INSTANCE_LIST_FIELDS = `managedInstances(${MANAGED_INSTANCE_FIELDS}),nextPageToken`;

export interface InstanceGroupManagerBasicInfo {
  name: string;
  id: string;
  creationTimestamp: string;
  instanceTemplate?: string;
  baseInstanceName?: string;
  targetSize?: number;
  targetStoppedSize?: number;
  targetSuspendedSize?: number;
  listManagedInstancesResults?: string;
  status?: Record<string, unknown>;
}

export interface ManagedInstanceSummary {
  name?: string;
  instance?: string;
  id?: string;
  instanceStatus?: string;
  version?: {
    name?: string;
    instanceTemplate?: string;
  };
  currentAction?: string;
}

type InstanceGroupManagerListResponse = {
  items?: InstanceGroupManagerBasicInfo[];
  nextPageToken?: string;
};

type ManagedInstanceListResponse = {
  managedInstances?: ManagedInstanceSummary[];
  nextPageToken?: string;
};

let instanceGroupManagerBasicInfoSchema = z.object({
  name: z.string().describe('Managed instance group name'),
  id: z.string().describe('Compute Engine managed instance group ID'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  instanceTemplate: z.string().optional().describe('Instance template resource URL'),
  baseInstanceName: z.string().optional().describe('Base name used for managed instances'),
  targetSize: z.number().int().optional().describe('Target number of running instances'),
  targetStoppedSize: z
    .number()
    .int()
    .optional()
    .describe('Target number of stopped instances'),
  targetSuspendedSize: z
    .number()
    .int()
    .optional()
    .describe('Target number of suspended instances'),
  listManagedInstancesResults: z
    .string()
    .optional()
    .describe(
      'Pagination mode for listManagedInstances; page tokens are supported only when this is PAGINATED'
    ),
  status: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Managed instance group stability and rollout status')
});

let managedInstanceSchema = z.object({
  name: z.string().optional().describe('Managed instance name'),
  instance: z.string().optional().describe('Managed instance resource URL'),
  id: z.string().optional().describe('Compute Engine instance ID'),
  instanceStatus: z.string().optional().describe('Current VM instance status'),
  version: z
    .object({
      name: z.string().optional().describe('Managed instance version name'),
      instanceTemplate: z.string().optional().describe('Intended instance template URL')
    })
    .optional()
    .describe('Intended template version for the managed instance'),
  currentAction: z.string().optional().describe('Action currently scheduled by the group')
});

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

let nameInput = z.string().trim().min(1).describe('Managed instance group name');

let pageSizeInput = z
  .number()
  .int()
  .min(0)
  .max(500)
  .optional()
  .describe('Maximum results to return, from 0 through 500');

let filterInput = z
  .string()
  .optional()
  .describe(
    "Compute Engine list filter expression, such as name eq '^web-.*'; list_managed_instances also supports instanceStatus and currentAction fields"
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

let instanceGroupManagersPath = (client: ComputeEngineClient, zone: string, name?: string) =>
  client.projectPath(
    name
      ? `zones/${encodeURIComponent(zone)}/instanceGroupManagers/${encodeURIComponent(name)}`
      : `zones/${encodeURIComponent(zone)}/instanceGroupManagers`
  );

let mapInstanceGroupManagerBasicInfo = (manager: InstanceGroupManagerBasicInfo) => ({
  name: manager.name,
  id: manager.id,
  createTime: manager.creationTimestamp,
  instanceTemplate: manager.instanceTemplate,
  baseInstanceName: manager.baseInstanceName,
  targetSize: manager.targetSize,
  targetStoppedSize: manager.targetStoppedSize,
  targetSuspendedSize: manager.targetSuspendedSize,
  listManagedInstancesResults: manager.listManagedInstancesResults,
  status: manager.status
});

export let getInstanceGroupManagerBasicInfo = SlateTool.create(spec, {
  name: 'Get Instance Group Manager Basic Info',
  key: 'get_instance_group_manager_basic_info',
  description:
    'Get a Compute Engine managed instance group name, ID, instance template, base name, target sizes, status, and creation timestamp.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(instanceGroupManagerBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let manager = await client.request<InstanceGroupManagerBasicInfo>(
      'get instance group manager basic info',
      {
        method: 'get',
        path: instanceGroupManagersPath(client, zone, ctx.input.name),
        params: { fields: INSTANCE_GROUP_MANAGER_BASIC_FIELDS }
      }
    );

    return {
      output: mapInstanceGroupManagerBasicInfo(manager),
      message: `Retrieved basic information for managed instance group **${manager.name}** in **${zone}**.`
    };
  })
  .build();

export let listInstanceGroupManagers = SlateTool.create(spec, {
  name: 'List Instance Group Managers',
  key: 'list_instance_group_managers',
  description:
    'List Compute Engine managed instance groups in a zone with their templates, target sizes, status, and creation timestamps.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      zone: zoneInput,
      filter: filterInput,
      pageSize: pageSizeInput,
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      instanceGroupManagers: z
        .array(instanceGroupManagerBasicInfoSchema)
        .describe('Managed instance groups found in the zone'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page of managed instance groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<InstanceGroupManagerListResponse>(
      'list instance group managers',
      {
        method: 'get',
        path: instanceGroupManagersPath(client, zone),
        params: pickDefined({
          filter: ctx.input.filter,
          maxResults: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          fields: INSTANCE_GROUP_MANAGER_LIST_FIELDS
        })
      }
    );
    let instanceGroupManagers = (response.items ?? []).map(mapInstanceGroupManagerBasicInfo);

    return {
      output: {
        instanceGroupManagers,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${instanceGroupManagers.length}** managed instance group(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();

export let listManagedInstances = SlateTool.create(spec, {
  name: 'List Managed Instances',
  key: 'list_managed_instances',
  description:
    'List instances in a Compute Engine managed instance group with instance status, intended template version, and current group action.',
  instructions: [
    'pageToken is supported only when the managed instance group listManagedInstancesResults setting is PAGINATED.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      zone: zoneInput,
      name: nameInput,
      filter: filterInput,
      pageSize: pageSizeInput,
      pageToken: z
        .string()
        .optional()
        .describe(
          'Pagination token from a previous call; supported only for groups configured with PAGINATED results'
        )
    })
  )
  .output(
    z.object({
      managedInstances: z
        .array(managedInstanceSchema)
        .describe('Instances managed by the group'),
      nextPageToken: z.string().optional().describe('Token for the next managed-instance page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<ManagedInstanceListResponse>(
      'list managed instances',
      {
        method: 'post',
        path: `${instanceGroupManagersPath(client, zone, ctx.input.name)}/listManagedInstances`,
        params: pickDefined({
          filter: ctx.input.filter,
          maxResults: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          fields: MANAGED_INSTANCE_LIST_FIELDS
        })
      }
    );
    let managedInstances = response.managedInstances ?? [];

    return {
      output: {
        managedInstances,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${managedInstances.length}** managed instance(s) in group **${ctx.input.name}** in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
