import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let INSTANCE_TEMPLATE_BASIC_FIELDS =
  'name,id,description,properties(machineType),region,creationTimestamp';
let INSTANCE_TEMPLATE_LIST_FIELDS = `items(${INSTANCE_TEMPLATE_BASIC_FIELDS}),nextPageToken`;

export interface InstanceTemplateBasicInfo {
  name: string;
  id: string;
  description?: string;
  properties?: {
    machineType?: string;
  };
  region?: string;
  creationTimestamp: string;
}

export interface InstanceTemplateProperties {
  [key: string]: unknown;
  description?: string;
  tags?: Record<string, unknown>;
  resourceManagerTags?: Record<string, string>;
  machineType?: string;
  canIpForward?: boolean;
  networkInterfaces?: Record<string, unknown>[];
  disks?: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
  serviceAccounts?: Record<string, unknown>[];
  scheduling?: Record<string, unknown>;
  labels?: Record<string, string>;
  guestAccelerators?: Array<{
    acceleratorType?: string;
    acceleratorCount?: number;
  }>;
  localSsdEncryptionMode?: string;
  minCpuPlatform?: string;
  reservationAffinity?: Record<string, unknown>;
  shieldedInstanceConfig?: Record<string, unknown>;
  resourcePolicies?: string[];
  confidentialInstanceConfig?: Record<string, unknown>;
  privateIpv6GoogleAccess?: string;
  advancedMachineFeatures?: Record<string, unknown>;
  networkPerformanceConfig?: Record<string, unknown>;
  keyRevocationActionType?: string;
  workloadIdentityConfig?: Record<string, unknown>;
}

type InstanceTemplateResponse = InstanceTemplateBasicInfo & {
  properties?: InstanceTemplateProperties;
};

type InstanceTemplateListResponse = {
  items?: InstanceTemplateBasicInfo[];
  nextPageToken?: string;
};

let instanceTemplateBasicInfoSchema = z.object({
  name: z.string().describe('Instance template name'),
  id: z.string().describe('Compute Engine instance template ID'),
  description: z.string().optional().describe('Instance template description'),
  machineType: z.string().optional().describe('Machine type used by the template'),
  region: z.string().optional().describe('Region URL for a regional instance template'),
  createTime: z.string().describe('RFC3339 creation timestamp')
});

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

export let instanceTemplatePropertiesSchema = z
  .object({
    description: z.string().optional().describe('Description applied to created instances'),
    tags: arbitraryObjectSchema.optional().describe('Network tags and their fingerprint'),
    resourceManagerTags: z
      .record(z.string(), z.string())
      .optional()
      .describe('Resource Manager tags bound to created instances'),
    machineType: z.string().optional().describe('Machine type name used by created instances'),
    canIpForward: z
      .boolean()
      .optional()
      .describe('Whether created instances can forward packets with other source IPs'),
    networkInterfaces: z
      .array(arbitraryObjectSchema)
      .optional()
      .describe('Complete network interface configurations'),
    disks: z
      .array(arbitraryObjectSchema)
      .optional()
      .describe('Complete attached and boot disk configurations'),
    metadata: arbitraryObjectSchema
      .optional()
      .describe('Instance metadata, including key-value items and fingerprint'),
    serviceAccounts: z
      .array(arbitraryObjectSchema)
      .optional()
      .describe('Service accounts and OAuth scopes for created instances'),
    scheduling: arbitraryObjectSchema
      .optional()
      .describe('Scheduling, maintenance, restart, and provisioning settings'),
    labels: z
      .record(z.string(), z.string())
      .optional()
      .describe('Labels applied to created instances'),
    guestAccelerators: z
      .array(
        z.object({
          acceleratorType: z.string().optional().describe('Accelerator type name'),
          acceleratorCount: z.number().int().optional().describe('Accelerator card count')
        })
      )
      .optional()
      .describe('Guest accelerator configurations'),
    localSsdEncryptionMode: z
      .string()
      .optional()
      .describe('Encryption mode for local SSD data'),
    minCpuPlatform: z.string().optional().describe('Minimum CPU platform'),
    reservationAffinity: arbitraryObjectSchema
      .optional()
      .describe('Reservation consumption affinity'),
    shieldedInstanceConfig: arbitraryObjectSchema.optional().describe('Shielded VM settings'),
    resourcePolicies: z
      .array(z.string())
      .optional()
      .describe('Resource policy URLs applied to created instances'),
    confidentialInstanceConfig: arbitraryObjectSchema
      .optional()
      .describe('Confidential VM settings'),
    privateIpv6GoogleAccess: z
      .string()
      .optional()
      .describe('Private IPv6 Google access setting'),
    advancedMachineFeatures: arbitraryObjectSchema
      .optional()
      .describe('Advanced machine feature settings'),
    networkPerformanceConfig: arbitraryObjectSchema
      .optional()
      .describe('Network performance settings'),
    keyRevocationActionType: z
      .string()
      .optional()
      .describe('Action taken when a confidential-compute key is revoked'),
    workloadIdentityConfig: arbitraryObjectSchema
      .optional()
      .describe('Workload identity configuration')
  })
  .passthrough();

let nameInput = z.string().trim().min(1).describe('Compute Engine instance template name');

let filterInput = z
  .string()
  .optional()
  .describe("Compute Engine list filter expression, such as name eq '^web-.*'");

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

let instanceTemplatesPath = (client: ComputeEngineClient, name?: string) =>
  client.projectPath(
    name ? `global/instanceTemplates/${encodeURIComponent(name)}` : 'global/instanceTemplates'
  );

let mapInstanceTemplateBasicInfo = (template: InstanceTemplateBasicInfo) => ({
  name: template.name,
  id: template.id,
  description: template.description,
  machineType: template.properties?.machineType,
  region: template.region,
  createTime: template.creationTimestamp
});

export let getInstanceTemplateBasicInfo = SlateTool.create(spec, {
  name: 'Get Instance Template Basic Info',
  key: 'get_instance_template_basic_info',
  description:
    'Get a global Compute Engine instance template name, ID, description, machine type, region, and creation timestamp.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ name: nameInput }))
  .output(instanceTemplateBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let template = await client.request<InstanceTemplateBasicInfo>(
      'get instance template basic info',
      {
        method: 'get',
        path: instanceTemplatesPath(client, ctx.input.name),
        params: { fields: INSTANCE_TEMPLATE_BASIC_FIELDS }
      }
    );

    return {
      output: mapInstanceTemplateBasicInfo(template),
      message: `Retrieved basic information for instance template **${template.name}**.`
    };
  })
  .build();

export let getInstanceTemplateProperties = SlateTool.create(spec, {
  name: 'Get Instance Template Properties',
  key: 'get_instance_template_properties',
  description:
    'Get the full instance properties of a global Compute Engine instance template, including disks, networks, metadata, scheduling, service accounts, accelerators, and security settings.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ name: nameInput }))
  .output(instanceTemplatePropertiesSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let template = await client.request<InstanceTemplateResponse>(
      'get instance template properties',
      {
        method: 'get',
        path: instanceTemplatesPath(client, ctx.input.name),
        params: { fields: 'properties' }
      }
    );
    let properties = template.properties ?? {};

    return {
      output: properties,
      message: `Retrieved instance properties for template **${ctx.input.name}**.`
    };
  })
  .build();

export let listInstanceTemplates = SlateTool.create(spec, {
  name: 'List Instance Templates',
  key: 'list_instance_templates',
  description:
    'List global Compute Engine instance templates with their names, IDs, descriptions, machine types, regions, and creation timestamps.',
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
        .describe('Maximum instance templates to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      instanceTemplates: z
        .array(instanceTemplateBasicInfoSchema)
        .describe('Global instance templates found in the project'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page of instance templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.request<InstanceTemplateListResponse>(
      'list instance templates',
      {
        method: 'get',
        path: instanceTemplatesPath(client),
        params: pickDefined({
          filter: ctx.input.filter,
          maxResults: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          fields: INSTANCE_TEMPLATE_LIST_FIELDS
        })
      }
    );
    let instanceTemplates = (response.items ?? []).map(mapInstanceTemplateBasicInfo);

    return {
      output: {
        instanceTemplates,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${instanceTemplates.length}** global instance template(s) in project **${client.projectId}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
