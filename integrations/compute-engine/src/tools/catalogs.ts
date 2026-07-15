import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let IMAGE_LIST_FIELDS = 'items(name,id,status,family,creationTimestamp),nextPageToken';
let MACHINE_TYPE_LIST_FIELDS =
  'items(kind,id,creationTimestamp,name,description,guestCpus,memoryMb,imageSpaceGb,maximumPersistentDisks,maximumPersistentDisksSizeGb,deprecated,zone,selfLink,isSharedCpu,accelerators,architecture,bundledLocalSsds),nextPageToken';
let ACCELERATOR_TYPE_LIST_FIELDS =
  'items(kind,id,creationTimestamp,name,description,deprecated,zone,selfLink,maximumCardsPerInstance),nextPageToken';

export let PUBLIC_IMAGE_PROJECTS = [
  'debian-cloud',
  'ubuntu-os-cloud',
  'rocky-linux-cloud',
  'centos-cloud',
  'cos-cloud',
  'rhel-cloud',
  'suse-cloud',
  'windows-cloud',
  'fedora-coreos-cloud',
  'opensuse-cloud'
] as const;

export interface ImageBasicInfo {
  name: string;
  id: string;
  status: string;
  family?: string;
  creationTimestamp: string;
}

export interface DeprecationStatus {
  state?: string;
  replacement?: string;
  deprecated?: string;
  obsolete?: string;
  deleted?: string;
}

export interface MachineTypeCatalogEntry {
  kind?: string;
  id: string;
  creationTimestamp?: string;
  name: string;
  description?: string;
  guestCpus?: number;
  memoryMb?: number;
  imageSpaceGb?: number;
  maximumPersistentDisks?: number;
  maximumPersistentDisksSizeGb?: string;
  deprecated?: DeprecationStatus;
  zone?: string;
  selfLink?: string;
  isSharedCpu?: boolean;
  accelerators?: Array<{
    guestAcceleratorType?: string;
    guestAcceleratorCount?: number;
  }>;
  architecture?: string;
  bundledLocalSsds?: {
    partitionCount?: number;
    defaultInterface?: string;
  };
}

export interface AcceleratorTypeCatalogEntry {
  kind?: string;
  id: string;
  creationTimestamp?: string;
  name: string;
  description?: string;
  deprecated?: DeprecationStatus;
  zone?: string;
  selfLink?: string;
  maximumCardsPerInstance?: number;
}

type ImageListResponse = {
  items?: ImageBasicInfo[];
  nextPageToken?: string;
};

type MachineTypeListResponse = {
  items?: MachineTypeCatalogEntry[];
  nextPageToken?: string;
};

type AcceleratorTypeListResponse = {
  items?: AcceleratorTypeCatalogEntry[];
  nextPageToken?: string;
};

let deprecationSchema = z.object({
  state: z
    .string()
    .optional()
    .describe('Deprecation state, such as DEPRECATED, OBSOLETE, or DELETED'),
  replacement: z.string().optional().describe('URL of the suggested replacement resource'),
  deprecated: z
    .string()
    .optional()
    .describe('RFC3339 time at which the resource is planned to become DEPRECATED'),
  obsolete: z
    .string()
    .optional()
    .describe('RFC3339 time at which the resource is planned to become OBSOLETE'),
  deleted: z
    .string()
    .optional()
    .describe('RFC3339 time at which the resource is planned to become DELETED')
});

let imageBasicInfoSchema = z.object({
  name: z.string().describe('Image name'),
  id: z.string().describe('Compute Engine image ID'),
  status: z.string().describe('Current image status'),
  family: z.string().optional().describe('Image family'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  sourceProject: z.string().describe('Project that owns the image')
});

let machineTypeSchema = z.object({
  kind: z.string().optional().describe('Compute Engine resource kind'),
  id: z.string().describe('Compute Engine machine type ID'),
  creationTimestamp: z.string().optional().describe('RFC3339 creation timestamp'),
  name: z.string().describe('Machine type name'),
  description: z.string().optional().describe('Machine type description'),
  guestCpus: z.number().int().optional().describe('Number of virtual CPUs'),
  memoryMb: z.number().int().optional().describe('Memory in MB'),
  imageSpaceGb: z.number().int().optional().describe('Deprecated image space in GB'),
  maximumPersistentDisks: z
    .number()
    .int()
    .optional()
    .describe('Maximum number of persistent disks allowed'),
  maximumPersistentDisksSizeGb: z
    .string()
    .optional()
    .describe('Maximum total persistent disk size in GB'),
  deprecated: deprecationSchema.optional().describe('Deprecation status of the machine type'),
  zone: z.string().optional().describe('Zone where the machine type resides'),
  selfLink: z.string().optional().describe('Canonical machine type resource URL'),
  isSharedCpu: z.boolean().optional().describe('Whether the machine type uses shared vCPUs'),
  accelerators: z
    .array(
      z.object({
        guestAcceleratorType: z.string().optional().describe('Bundled accelerator type'),
        guestAcceleratorCount: z
          .number()
          .int()
          .optional()
          .describe('Number of bundled accelerator cards')
      })
    )
    .optional()
    .describe('Accelerators bundled with the machine type'),
  architecture: z.string().optional().describe('CPU architecture, such as X86_64 or ARM64'),
  bundledLocalSsds: z
    .object({
      partitionCount: z
        .number()
        .int()
        .optional()
        .describe('Number of bundled local SSD partitions'),
      defaultInterface: z
        .string()
        .optional()
        .describe('Default bundled local SSD interface, such as NVME or SCSI')
    })
    .optional()
    .describe('Local SSDs bundled with the machine type')
});

let acceleratorTypeSchema = z.object({
  kind: z.string().optional().describe('Compute Engine resource kind'),
  id: z.string().describe('Compute Engine accelerator type ID'),
  creationTimestamp: z.string().optional().describe('RFC3339 creation timestamp'),
  name: z.string().describe('Accelerator type name'),
  description: z.string().optional().describe('Accelerator type description'),
  deprecated: deprecationSchema
    .optional()
    .describe('Deprecation status of the accelerator type'),
  zone: z.string().optional().describe('Zone where the accelerator type resides'),
  selfLink: z.string().optional().describe('Canonical accelerator type resource URL'),
  maximumCardsPerInstance: z
    .number()
    .int()
    .optional()
    .describe('Maximum accelerator cards allowed per instance')
});

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

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

let zonalCatalogPath = (
  client: ComputeEngineClient,
  zone: string,
  collection: 'machineTypes' | 'acceleratorTypes'
) => client.projectPath(`zones/${encodeURIComponent(zone)}/${collection}`);

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description:
    'List Compute Engine images. By default aggregates the configured project and the standard public image projects; set imageProject to page through a single project such as debian-cloud or windows-cloud.',
  instructions: [
    `When imageProject is omitted, images from the configured project and the standard public image projects (${PUBLIC_IMAGE_PROJECTS.join(', ')}) are aggregated, each image is tagged with its sourceProject, pageSize applies per project, and no nextPageToken is returned.`,
    'pageToken is supported only together with an explicit imageProject.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      imageProject: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Project whose images to list, such as a public image project; when omitted, the configured project and the standard public image projects are aggregated'
        ),
      filter: filterInput,
      pageSize: z
        .number()
        .int()
        .min(0)
        .max(500)
        .optional()
        .describe(
          'Maximum images to return, from 0 through 500; applies per source project when imageProject is omitted'
        ),
      pageToken: z
        .string()
        .optional()
        .describe(
          'Pagination token from a previous call; supported only with an explicit imageProject'
        )
    })
  )
  .output(
    z.object({
      images: z
        .array(imageBasicInfoSchema)
        .describe('Images tagged with their source project'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page; returned only when imageProject is provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let listProjectImages = async (imageProject: string) => {
      let response = await client.request<ImageListResponse>('list images', {
        method: 'get',
        path: `projects/${encodeURIComponent(imageProject)}/global/images`,
        params: pickDefined({
          filter: ctx.input.filter,
          maxResults: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          fields: IMAGE_LIST_FIELDS
        })
      });

      return {
        images: (response.items ?? []).map(image => ({
          name: image.name,
          id: image.id,
          status: image.status,
          family: image.family,
          createTime: image.creationTimestamp,
          sourceProject: imageProject
        })),
        nextPageToken: response.nextPageToken
      };
    };

    if (ctx.input.imageProject) {
      let { images, nextPageToken } = await listProjectImages(ctx.input.imageProject);

      return {
        output: {
          images,
          nextPageToken
        },
        message: `Found **${images.length}** image(s) in project **${ctx.input.imageProject}**.${nextPageToken ? ' More results are available.' : ''}`
      };
    }

    if (ctx.input.pageToken) {
      throw createApiServiceError(
        'pageToken is supported only with an explicit imageProject. Provide imageProject to page through a single project.',
        { reason: 'compute_engine_validation_error' }
      );
    }

    let imageProjects = [...new Set([client.projectId, ...PUBLIC_IMAGE_PROJECTS])];
    let images: Awaited<ReturnType<typeof listProjectImages>>['images'] = [];
    for (let imageProject of imageProjects) {
      let page = await listProjectImages(imageProject);
      images.push(...page.images);
    }

    return {
      output: { images },
      message: `Found **${images.length}** image(s) across project **${client.projectId}** and **${PUBLIC_IMAGE_PROJECTS.length}** public image projects. Provide imageProject to page through a single project.`
    };
  })
  .build();

export let listMachineTypes = SlateTool.create(spec, {
  name: 'List Machine Types',
  key: 'list_machine_types',
  description:
    'List Compute Engine machine types available in a zone, including vCPU, memory, disk, accelerator, and architecture details.',
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
        .describe('Maximum machine types to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      machineTypes: z.array(machineTypeSchema).describe('Machine types available in the zone'),
      nextPageToken: z.string().optional().describe('Token for the next page of machine types')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<MachineTypeListResponse>('list machine types', {
      method: 'get',
      path: zonalCatalogPath(client, zone, 'machineTypes'),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: MACHINE_TYPE_LIST_FIELDS
      })
    });
    let machineTypes = response.items ?? [];

    return {
      output: {
        machineTypes,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${machineTypes.length}** machine type(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();

export let listAcceleratorTypes = SlateTool.create(spec, {
  name: 'List Accelerator Types',
  key: 'list_accelerator_types',
  description:
    'List Compute Engine GPU and accelerator types available in a zone, including deprecation and card-limit details.',
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
        .describe('Maximum accelerator types to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      acceleratorTypes: z
        .array(acceleratorTypeSchema)
        .describe('Accelerator types available in the zone'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page of accelerator types')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<AcceleratorTypeListResponse>(
      'list accelerator types',
      {
        method: 'get',
        path: zonalCatalogPath(client, zone, 'acceleratorTypes'),
        params: pickDefined({
          filter: ctx.input.filter,
          maxResults: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          fields: ACCELERATOR_TYPE_LIST_FIELDS
        })
      }
    );
    let acceleratorTypes = response.items ?? [];

    return {
      output: {
        acceleratorTypes,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${acceleratorTypes.length}** accelerator type(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
