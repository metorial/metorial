import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let INSTANCE_BASIC_FIELDS =
  'name,id,status,machineType,creationTimestamp,guestAccelerators(acceleratorType,acceleratorCount)';
let INSTANCE_LIST_FIELDS = `items(${INSTANCE_BASIC_FIELDS}),nextPageToken`;
let OPERATION_FIELDS = 'name,status';

export interface ComputeZoneOperationSummary {
  name: string;
  status: string;
}

export interface GuestAcceleratorConfig {
  acceleratorType: string;
  acceleratorCount: number;
}

export interface InstanceBasicInfo {
  name: string;
  id: string;
  status: string;
  machineType: string;
  creationTimestamp: string;
  guestAccelerators?: GuestAcceleratorConfig[];
}

export interface AttachedDisk {
  [key: string]: unknown;
  kind?: string;
  type?: string;
  mode?: string;
  savedState?: string;
  source?: string;
  deviceName?: string;
  index?: number;
  boot?: boolean;
  initializeParams?: Record<string, unknown>;
  autoDelete?: boolean;
  licenses?: string[];
  interface?: string;
  guestOsFeatures?: Array<{ type?: string }>;
  diskEncryptionKey?: Record<string, unknown>;
  diskSizeGb?: string;
  shieldedInstanceInitialState?: Record<string, unknown>;
  forceAttach?: boolean;
  architecture?: string;
}

type InstanceResponse = InstanceBasicInfo & {
  disks?: AttachedDisk[];
};

type InstanceListResponse = {
  items?: InstanceBasicInfo[];
  nextPageToken?: string;
};

let guestAcceleratorSchema = z.object({
  acceleratorType: z
    .string()
    .trim()
    .min(1)
    .describe('Accelerator short name or full or partial Compute Engine resource URL'),
  acceleratorCount: z
    .number()
    .int()
    .positive()
    .describe('Number of accelerator cards exposed to the guest')
});

let guestAcceleratorOutputSchema = z.object({
  acceleratorType: z.string().describe('Accelerator type resource URL'),
  acceleratorCount: z.number().int().describe('Number of accelerator cards')
});

let instanceBasicInfoSchema = z.object({
  name: z.string().describe('Instance name'),
  id: z.string().describe('Compute Engine instance ID'),
  status: z.string().describe('Current instance status'),
  machineType: z.string().describe('Machine type resource URL'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  guestAccelerators: z
    .array(guestAcceleratorOutputSchema)
    .optional()
    .describe('Accelerators attached to the instance')
});

let attachedDiskSchema = z
  .object({
    kind: z.string().optional().describe('Compute Engine resource kind'),
    type: z.string().optional().describe('Disk type, either SCRATCH or PERSISTENT'),
    mode: z.string().optional().describe('Attachment mode, either READ_WRITE or READ_ONLY'),
    savedState: z.string().optional().describe('Preserved state of the attached disk'),
    source: z.string().optional().describe('Persistent disk resource URL'),
    deviceName: z.string().optional().describe('Unique device name exposed inside the guest'),
    index: z.number().int().optional().describe('Zero-based index of the attached disk'),
    boot: z.boolean().optional().describe('Whether this is the boot disk'),
    initializeParams: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Parameters used to create the disk alongside the instance'),
    autoDelete: z
      .boolean()
      .optional()
      .describe('Whether the disk is deleted when the instance is deleted'),
    licenses: z
      .array(z.string())
      .optional()
      .describe('License resource URLs applied to the disk'),
    interface: z.string().optional().describe('Disk interface, either SCSI or NVME'),
    guestOsFeatures: z
      .array(z.object({ type: z.string().optional().describe('Guest OS feature type') }))
      .optional()
      .describe('Guest OS features enabled on the disk'),
    diskEncryptionKey: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Disk encryption key details'),
    diskSizeGb: z.string().optional().describe('Disk size in GB'),
    shieldedInstanceInitialState: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Shielded VM initial state of the boot disk'),
    forceAttach: z.boolean().optional().describe('Whether the disk was force-attached'),
    architecture: z.string().optional().describe('Disk architecture, such as X86_64 or ARM64')
  })
  .passthrough();

let operationOutputSchema = z.object({
  operationName: z.string().describe('Name of the Compute Engine zone operation'),
  status: z.string().describe('Current operation status')
});

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

let nameInput = z.string().trim().min(1).describe('Compute Engine instance name');

let filterInput = z
  .string()
  .optional()
  .describe(
    "Compute Engine list filter expression, such as status = RUNNING or name eq '^web-.*'"
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

let zoneResource = (zone: string, collection: string, name: string) =>
  `zones/${encodeURIComponent(zone)}/${collection}/${encodeURIComponent(name)}`;

let machineTypeResource = (zone: string, machineType: string) =>
  machineType.includes('/') ? machineType : zoneResource(zone, 'machineTypes', machineType);

let acceleratorTypeResource = (zone: string, acceleratorType: string) =>
  acceleratorType.includes('/')
    ? acceleratorType
    : zoneResource(zone, 'acceleratorTypes', acceleratorType);

let instancePath = (client: ComputeEngineClient, zone: string, name?: string) =>
  client.projectPath(
    name
      ? `zones/${encodeURIComponent(zone)}/instances/${encodeURIComponent(name)}`
      : `zones/${encodeURIComponent(zone)}/instances`
  );

let mapInstanceBasicInfo = (instance: InstanceBasicInfo) => ({
  name: instance.name,
  id: instance.id,
  status: instance.status,
  machineType: instance.machineType,
  createTime: instance.creationTimestamp,
  guestAccelerators: instance.guestAccelerators
});

let mapOperation = (operation: ComputeZoneOperationSummary, zone: string, action: string) => ({
  output: {
    operationName: operation.name,
    status: operation.status
  },
  message: `${action} operation **${operation.name}** is **${operation.status}**. Use \`get_zone_operation\` with zone **${zone}** and operation name **${operation.name}** to monitor completion.`
});

export let createInstance = SlateTool.create(spec, {
  name: 'Create Instance',
  key: 'create_instance',
  description:
    'Create a Compute Engine VM. Defaults to e2-medium and the debian-cloud debian-12 image family. Returns a zone operation for asynchronous completion.',
  instructions: [
    'Use get_zone_operation with the returned operationName and resolved zone to monitor completion.',
    'When guest accelerators are requested, onHostMaintenance is forced to TERMINATE because GPU instances cannot live migrate.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(computeEngineActionScopes.write)
  .input(
    z.object({
      zone: zoneInput,
      name: nameInput,
      machineType: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Machine type short name or resource URL; defaults to e2-medium'),
      imageFamily: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Boot image family; defaults to debian-12'),
      imageProject: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Project that owns the boot image family; defaults to debian-cloud'),
      guestAccelerators: z
        .array(guestAcceleratorSchema)
        .min(1)
        .optional()
        .describe('Guest accelerator configurations to attach'),
      maintenancePolicy: z
        .enum(['MIGRATE', 'TERMINATE'])
        .optional()
        .describe(
          'Host maintenance behavior. GPU instances always use TERMINATE regardless of this value.'
        )
    })
  )
  .output(operationOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let machineType = ctx.input.machineType ?? 'e2-medium';
    let imageFamily = ctx.input.imageFamily ?? 'debian-12';
    let imageProject = ctx.input.imageProject ?? 'debian-cloud';
    let guestAccelerators = ctx.input.guestAccelerators?.map(accelerator => ({
      acceleratorType: acceleratorTypeResource(zone, accelerator.acceleratorType),
      acceleratorCount: accelerator.acceleratorCount
    }));
    let onHostMaintenance = guestAccelerators?.length
      ? 'TERMINATE'
      : ctx.input.maintenancePolicy;

    let operation = await client.request<ComputeZoneOperationSummary>('create instance', {
      method: 'post',
      path: instancePath(client, zone),
      params: { fields: OPERATION_FIELDS },
      body: {
        name: ctx.input.name,
        machineType: machineTypeResource(zone, machineType),
        disks: [
          {
            boot: true,
            autoDelete: true,
            initializeParams: {
              sourceImage: `projects/${encodeURIComponent(imageProject)}/global/images/family/${encodeURIComponent(imageFamily)}`
            }
          }
        ],
        networkInterfaces: [{ network: 'global/networks/default' }],
        ...(guestAccelerators ? { guestAccelerators } : {}),
        ...(onHostMaintenance ? { scheduling: { onHostMaintenance } } : {})
      }
    });

    return mapOperation(operation, zone, 'Create instance');
  })
  .build();

let buildInstanceLifecycleTool = (
  key: 'delete_instance' | 'start_instance' | 'stop_instance' | 'reset_instance',
  name: string,
  description: string,
  method: 'delete' | 'post',
  suffix: '' | '/start' | '/stop' | '/reset',
  destructive: boolean,
  operation: string
) =>
  SlateTool.create(spec, {
    name,
    key,
    description,
    instructions: [
      'Use get_zone_operation with the returned operationName and resolved zone to monitor completion.'
    ],
    tags: {
      destructive,
      readOnly: false
    }
  })
    .scopes(computeEngineActionScopes.write)
    .input(z.object({ zone: zoneInput, name: nameInput }))
    .output(operationOutputSchema)
    .handleInvocation(async ctx => {
      let client = createClient(ctx);
      let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
      let result = await client.request<ComputeZoneOperationSummary>(operation, {
        method,
        path: `${instancePath(client, zone, ctx.input.name)}${suffix}`,
        params: { fields: OPERATION_FIELDS }
      });

      return mapOperation(result, zone, name);
    })
    .build();

export let deleteInstance = buildInstanceLifecycleTool(
  'delete_instance',
  'Delete Instance',
  'Delete a Compute Engine VM and return the zone operation for asynchronous completion.',
  'delete',
  '',
  true,
  'delete instance'
);

export let startInstance = buildInstanceLifecycleTool(
  'start_instance',
  'Start Instance',
  'Start a stopped Compute Engine VM and return the zone operation for asynchronous completion.',
  'post',
  '/start',
  false,
  'start instance'
);

export let stopInstance = buildInstanceLifecycleTool(
  'stop_instance',
  'Stop Instance',
  'Stop a running Compute Engine VM and return the zone operation for asynchronous completion.',
  'post',
  '/stop',
  true,
  'stop instance'
);

export let resetInstance = buildInstanceLifecycleTool(
  'reset_instance',
  'Reset Instance',
  'Hard-reset a Compute Engine VM and return the zone operation for asynchronous completion.',
  'post',
  '/reset',
  true,
  'reset instance'
);

export let setInstanceMachineType = SlateTool.create(spec, {
  name: 'Set Instance Machine Type',
  key: 'set_instance_machine_type',
  description:
    'Change the machine type of a stopped Compute Engine VM. The instance must be stopped before invoking this tool.',
  instructions: [
    'Stop the instance before changing its machine type.',
    'Use get_zone_operation with the returned operationName and resolved zone to monitor completion.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(computeEngineActionScopes.write)
  .input(
    z.object({
      zone: zoneInput,
      name: nameInput,
      machineType: z
        .string()
        .trim()
        .min(1)
        .describe('New machine type short name or full or partial resource URL')
    })
  )
  .output(operationOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let operation = await client.request<ComputeZoneOperationSummary>(
      'set instance machine type',
      {
        method: 'post',
        path: `${instancePath(client, zone, ctx.input.name)}/setMachineType`,
        params: { fields: OPERATION_FIELDS },
        body: {
          machineType: machineTypeResource(zone, ctx.input.machineType)
        }
      }
    );

    return mapOperation(operation, zone, 'Set instance machine type');
  })
  .build();

export let getInstanceBasicInfo = SlateTool.create(spec, {
  name: 'Get Instance Basic Info',
  key: 'get_instance_basic_info',
  description:
    'Get a Compute Engine VM name, ID, status, machine type, creation timestamp, and guest accelerators.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(instanceBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let instance = await client.request<InstanceResponse>('get instance basic info', {
      method: 'get',
      path: instancePath(client, zone, ctx.input.name),
      params: { fields: INSTANCE_BASIC_FIELDS }
    });

    return {
      output: mapInstanceBasicInfo(instance),
      message: `Retrieved basic information for instance **${instance.name}** in **${zone}**.`
    };
  })
  .build();

export let listInstances = SlateTool.create(spec, {
  name: 'List Instances',
  key: 'list_instances',
  description:
    'List Compute Engine VMs in a zone with basic status, machine type, creation time, and accelerator details.',
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
        .describe('Maximum instances to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      instances: z.array(instanceBasicInfoSchema).describe('Instances found in the zone'),
      nextPageToken: z.string().optional().describe('Token for the next page of instances')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<InstanceListResponse>('list instances', {
      method: 'get',
      path: instancePath(client, zone),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: INSTANCE_LIST_FIELDS
      })
    });
    let instances = (response.items ?? []).map(mapInstanceBasicInfo);

    return {
      output: {
        instances,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${instances.length}** instance(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();

export let listInstanceAttachedDisks = SlateTool.create(spec, {
  name: 'List Instance Attached Disks',
  key: 'list_instance_attached_disks',
  description:
    'List the complete Compute Engine attached-disk configurations for a VM instance.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(
    z.object({
      attachedDisks: z
        .array(attachedDiskSchema)
        .describe('Complete attached-disk configurations for the instance')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let instance = await client.request<InstanceResponse>('list instance attached disks', {
      method: 'get',
      path: instancePath(client, zone, ctx.input.name),
      params: { fields: 'disks' }
    });
    let attachedDisks = instance.disks ?? [];

    return {
      output: { attachedDisks },
      message: `Found **${attachedDisks.length}** disk(s) attached to instance **${ctx.input.name}** in **${zone}**.`
    };
  })
  .build();
