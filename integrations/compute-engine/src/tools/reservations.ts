import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineZone } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';

let RESERVATION_BASIC_FIELDS =
  'name,id,creationTimestamp,zone,status,commitment,linkedCommitments,specificReservationRequired';
let RESERVATION_LIST_FIELDS = `items(${RESERVATION_BASIC_FIELDS}),nextPageToken`;
let RESERVATION_DETAILS_FIELDS =
  'kind,id,creationTimestamp,selfLink,zone,description,name,commitment,linkedCommitments,specificReservationRequired,status,shareSettings,satisfiesPzs,resourcePolicies,resourceStatus,reservationSharingPolicy,deploymentType,advancedDeploymentControl,enableEmergentMaintenance,protectionTier,schedulingType,confidentialComputeType,earlyAccessMaintenance,specificReservation,aggregateReservation,deleteAtTime,deleteAfterDuration';

export interface ReservationBasicInfo {
  name: string;
  id: string;
  creationTimestamp: string;
  zone: string;
  status: string;
  commitment?: string;
  linkedCommitments?: string[];
  specificReservationRequired?: boolean;
}

export interface SpecificReservationDetails {
  [key: string]: unknown;
  instanceProperties?: {
    machineType?: string;
    guestAccelerators?: Array<{
      acceleratorType?: string;
      acceleratorCount?: number;
    }>;
    minCpuPlatform?: string;
    localSsds?: Array<{
      diskSizeGb?: string;
      interface?: string;
    }>;
    locationHint?: string;
  };
  count?: string;
  inUseCount?: string;
  assuredCount?: string;
  sourceInstanceTemplate?: string;
}

export interface AggregateReservationDetails {
  [key: string]: unknown;
  vmFamily?: string;
  reservedResources?: Array<{
    [key: string]: unknown;
    accelerator?: {
      acceleratorCount?: number;
      acceleratorType?: string;
    };
  }>;
  inUseResources?: Array<{
    [key: string]: unknown;
    accelerator?: {
      acceleratorCount?: number;
      acceleratorType?: string;
    };
  }>;
  workloadType?: string;
}

export interface ReservationDetails {
  [key: string]: unknown;
  kind?: string;
  id?: string;
  creationTimestamp?: string;
  selfLink?: string;
  zone?: string;
  description?: string;
  name?: string;
  commitment?: string;
  linkedCommitments?: string[];
  specificReservationRequired?: boolean;
  status?: string;
  shareSettings?: {
    [key: string]: unknown;
    shareType?: string;
    projectMap?: Record<
      string,
      {
        [key: string]: unknown;
        projectId?: string;
      }
    >;
  };
  satisfiesPzs?: boolean;
  resourcePolicies?: Record<string, string>;
  resourceStatus?: Record<string, unknown>;
  reservationSharingPolicy?: {
    [key: string]: unknown;
    serviceShareType?: string;
  };
  deploymentType?: string;
  advancedDeploymentControl?: Record<string, unknown>;
  enableEmergentMaintenance?: boolean;
  protectionTier?: string;
  schedulingType?: string;
  confidentialComputeType?: string;
  earlyAccessMaintenance?: string;
  specificReservation?: SpecificReservationDetails;
  aggregateReservation?: AggregateReservationDetails;
  deleteAtTime?: string;
  deleteAfterDuration?: {
    seconds?: string;
    nanos?: number;
  };
}

type ReservationListResponse = {
  items?: ReservationBasicInfo[];
  nextPageToken?: string;
};

let reservationBasicInfoSchema = z.object({
  name: z.string().describe('Reservation name'),
  id: z.string().describe('Compute Engine reservation ID'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  zone: z.string().describe('Zone resource URL for the reservation'),
  status: z.string().describe('Current reservation status'),
  commitment: z.string().optional().describe('Parent commitment resource URL'),
  linkedCommitments: z
    .array(z.string())
    .optional()
    .describe('Commitments linked to the reservation'),
  specificReservationRequired: z
    .boolean()
    .optional()
    .describe('Whether VMs must target this reservation by name')
});

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let shareSettingsSchema = z
  .object({
    shareType: z.string().optional().describe('Reservation project-sharing mode'),
    projectMap: z
      .record(
        z.string(),
        z
          .object({
            projectId: z
              .string()
              .optional()
              .describe('Project ID allowed to use the reservation')
          })
          .passthrough()
      )
      .optional()
      .describe('Projects allowed to consume a specifically shared reservation')
  })
  .passthrough();

let reservationSharingPolicySchema = z
  .object({
    serviceShareType: z
      .string()
      .optional()
      .describe('Sharing mode for Google Cloud managed services')
  })
  .passthrough();

let reservationAcceleratorSchema = z.object({
  acceleratorType: z.string().optional().describe('Accelerator type resource URL'),
  acceleratorCount: z.number().int().optional().describe('Number of accelerator cards')
});

let specificReservationSchema = z
  .object({
    instanceProperties: z
      .object({
        machineType: z.string().optional().describe('Reserved machine type'),
        guestAccelerators: z
          .array(reservationAcceleratorSchema)
          .optional()
          .describe('Reserved guest accelerators'),
        minCpuPlatform: z.string().optional().describe('Minimum reserved CPU platform'),
        localSsds: z
          .array(
            z.object({
              diskSizeGb: z.string().optional().describe('Local SSD size in GiB'),
              interface: z
                .string()
                .optional()
                .describe('Local SSD interface, such as SCSI or NVME')
            })
          )
          .optional()
          .describe('Reserved local SSD configurations'),
        locationHint: z.string().optional().describe('Opaque placement location hint')
      })
      .optional()
      .describe('Machine shape reserved for each instance'),
    count: z.string().optional().describe('Number of reserved instances'),
    inUseCount: z
      .string()
      .optional()
      .describe('Number of reserved instances currently in use'),
    assuredCount: z
      .string()
      .optional()
      .describe('Number of reserved instances currently usable'),
    sourceInstanceTemplate: z
      .string()
      .optional()
      .describe('Instance template used instead of inline instance properties')
  })
  .passthrough();

let aggregateResourceSchema = z
  .object({
    accelerator: reservationAcceleratorSchema
      .optional()
      .describe('Reserved or consumed accelerator resource')
  })
  .passthrough();

let aggregateReservationSchema = z
  .object({
    vmFamily: z.string().optional().describe('VM family covered by the reservation'),
    reservedResources: z
      .array(aggregateResourceSchema)
      .optional()
      .describe('Aggregate resources reserved'),
    inUseResources: z
      .array(aggregateResourceSchema)
      .optional()
      .describe('Aggregate reserved resources currently in use'),
    workloadType: z.string().optional().describe('Workload type eligible for the reservation')
  })
  .passthrough();

export let reservationDetailsSchema = z
  .object({
    kind: z.string().optional().describe('Compute Engine reservation resource kind'),
    id: z.string().optional().describe('Compute Engine reservation ID'),
    creationTimestamp: z.string().optional().describe('RFC3339 creation timestamp'),
    selfLink: z.string().optional().describe('Canonical reservation resource URL'),
    zone: z.string().optional().describe('Zone resource URL for the reservation'),
    description: z.string().optional().describe('Reservation description'),
    name: z.string().optional().describe('Reservation name'),
    commitment: z.string().optional().describe('Parent commitment resource URL'),
    linkedCommitments: z
      .array(z.string())
      .optional()
      .describe('Parent commitment URLs for a multi-commitment reservation'),
    specificReservationRequired: z
      .boolean()
      .optional()
      .describe('Whether consumers must target this reservation by name'),
    status: z.string().optional().describe('Current reservation status'),
    shareSettings: shareSettingsSchema.optional().describe('Cross-project sharing settings'),
    satisfiesPzs: z.boolean().optional().describe('Whether the reservation satisfies PZS'),
    resourcePolicies: z
      .record(z.string(), z.string())
      .optional()
      .describe('Placement resource policies associated with the reservation'),
    resourceStatus: arbitraryObjectSchema
      .optional()
      .describe('Allocation, utilization, maintenance, and health status'),
    reservationSharingPolicy: reservationSharingPolicySchema
      .optional()
      .describe('Google Cloud managed-service sharing policy'),
    deploymentType: z.string().optional().describe('Reservation deployment strategy'),
    advancedDeploymentControl: arbitraryObjectSchema
      .optional()
      .describe('Advanced dense-deployment controls'),
    enableEmergentMaintenance: z
      .boolean()
      .optional()
      .describe('Whether unplanned maintenance is allowed'),
    protectionTier: z.string().optional().describe('Infrastructure protection tier'),
    schedulingType: z.string().optional().describe('Reservation maintenance scheduling type'),
    confidentialComputeType: z
      .string()
      .optional()
      .describe('Confidential-compute technology reserved'),
    earlyAccessMaintenance: z
      .string()
      .optional()
      .describe('Early-access maintenance enrollment'),
    specificReservation: specificReservationSchema
      .optional()
      .describe('Fixed machine-shape reservation details'),
    aggregateReservation: aggregateReservationSchema
      .optional()
      .describe('Shape-flexible aggregate reservation details'),
    deleteAtTime: z.string().optional().describe('RFC3339 automatic deletion time'),
    deleteAfterDuration: z
      .object({
        seconds: z
          .string()
          .optional()
          .describe('Whole seconds after creation before deletion'),
        nanos: z.number().int().optional().describe('Fractional nanoseconds of the duration')
      })
      .optional()
      .describe('Duration after creation before automatic deletion')
  })
  .passthrough();

let zoneInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine zone; defaults to the configured defaultZone');

let nameInput = z.string().trim().min(1).describe('Compute Engine reservation name');

let filterInput = z
  .string()
  .optional()
  .describe(
    "Compute Engine list filter expression, such as status = READY or name eq '^batch-.*'"
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

let reservationsPath = (client: ComputeEngineClient, zone: string, name?: string) =>
  client.projectPath(
    name
      ? `zones/${encodeURIComponent(zone)}/reservations/${encodeURIComponent(name)}`
      : `zones/${encodeURIComponent(zone)}/reservations`
  );

let mapReservationBasicInfo = (reservation: ReservationBasicInfo) => ({
  name: reservation.name,
  id: reservation.id,
  createTime: reservation.creationTimestamp,
  zone: reservation.zone,
  status: reservation.status,
  commitment: reservation.commitment,
  linkedCommitments: reservation.linkedCommitments,
  specificReservationRequired: reservation.specificReservationRequired
});

export let getReservationBasicInfo = SlateTool.create(spec, {
  name: 'Get Reservation Basic Info',
  key: 'get_reservation_basic_info',
  description:
    'Get a Compute Engine reservation name, ID, creation timestamp, zone, status, commitment links, and targeting requirement.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(reservationBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let reservation = await client.request<ReservationBasicInfo>(
      'get reservation basic info',
      {
        method: 'get',
        path: reservationsPath(client, zone, ctx.input.name),
        params: { fields: RESERVATION_BASIC_FIELDS }
      }
    );

    return {
      output: mapReservationBasicInfo(reservation),
      message: `Retrieved basic information for reservation **${reservation.name}** in **${zone}**.`
    };
  })
  .build();

export let getReservationDetails = SlateTool.create(spec, {
  name: 'Get Reservation Details',
  key: 'get_reservation_details',
  description:
    'Get full details for a Compute Engine reservation, including machine shape, accelerators, local SSDs, aggregate resources, commitments, sharing, and resource status.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ zone: zoneInput, name: nameInput }))
  .output(reservationDetailsSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let reservation = await client.request<ReservationDetails>('get reservation details', {
      method: 'get',
      path: reservationsPath(client, zone, ctx.input.name),
      params: { fields: RESERVATION_DETAILS_FIELDS }
    });

    return {
      output: reservation,
      message: `Retrieved details for reservation **${ctx.input.name}** in **${zone}**.`
    };
  })
  .build();

export let listReservations = SlateTool.create(spec, {
  name: 'List Reservations',
  key: 'list_reservations',
  description:
    'List Compute Engine reservations in a zone with basic identity, status, commitment links, and targeting requirements.',
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
        .describe('Maximum reservations to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      reservations: z
        .array(reservationBasicInfoSchema)
        .describe('Reservations found in the zone'),
      nextPageToken: z.string().optional().describe('Token for the next page of reservations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let zone = resolveComputeEngineZone(ctx.input.zone, client.defaultZone);
    let response = await client.request<ReservationListResponse>('list reservations', {
      method: 'get',
      path: reservationsPath(client, zone),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: RESERVATION_LIST_FIELDS
      })
    });
    let reservations = (response.items ?? []).map(mapReservationBasicInfo);

    return {
      output: {
        reservations,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${reservations.length}** reservation(s) in **${zone}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();
