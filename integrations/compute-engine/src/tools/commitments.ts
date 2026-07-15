import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { ComputeEngineClient } from '../lib/client';
import { resolveComputeEngineRegion } from '../lib/errors';
import { computeEngineActionScopes } from '../scopes';
import { spec } from '../spec';
import { type ReservationDetails, reservationDetailsSchema } from './reservations';

let COMMITMENT_BASIC_FIELDS =
  'name,id,status,statusMessage,plan,category,type,region,selfLink,creationTimestamp,startTimestamp,endTimestamp,resources(type,amount,acceleratorType)';
let COMMITMENT_LIST_FIELDS = `items(${COMMITMENT_BASIC_FIELDS}),nextPageToken`;

export interface CommitmentResource {
  type: string;
  amount: string;
  acceleratorType?: string;
}

export interface CommitmentBasicInfo {
  name: string;
  id: string;
  status: string;
  statusMessage?: string;
  plan: string;
  category?: string;
  type?: string;
  region?: string;
  selfLink?: string;
  creationTimestamp: string;
  startTimestamp: string;
  endTimestamp: string;
  resources?: CommitmentResource[];
}

type CommitmentResponse = CommitmentBasicInfo & {
  reservations?: ReservationDetails[];
};

type CommitmentListResponse = {
  items?: CommitmentBasicInfo[];
  nextPageToken?: string;
};

let commitmentResourceSchema = z.object({
  type: z.string().describe('Committed hardware resource type'),
  amount: z.string().describe('Committed resource quantity'),
  acceleratorType: z.string().optional().describe('Accelerator type for GPU commitments')
});

let commitmentBasicInfoSchema = z.object({
  name: z.string().describe('Commitment name'),
  id: z.string().describe('Compute Engine commitment ID'),
  status: z.string().describe('Current commitment status'),
  statusMessage: z.string().optional().describe('Human-readable commitment status details'),
  plan: z.string().describe('Commitment term plan'),
  category: z.string().optional().describe('Commitment category, such as MACHINE or LICENSE'),
  type: z
    .string()
    .optional()
    .describe('Machine series type for a MACHINE-category commitment'),
  region: z.string().optional().describe('Region resource URL for the commitment'),
  selfLink: z.string().optional().describe('Canonical commitment resource URL'),
  createTime: z.string().describe('RFC3339 creation timestamp'),
  startTime: z.string().describe('RFC3339 commitment start timestamp'),
  endTime: z.string().describe('RFC3339 commitment end timestamp'),
  resources: z
    .array(commitmentResourceSchema)
    .optional()
    .describe('Hardware resources covered by the commitment')
});

let regionInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe('Compute Engine region; defaults to the configured defaultRegion');

let nameInput = z.string().trim().min(1).describe('Compute Engine commitment name');

let filterInput = z
  .string()
  .optional()
  .describe(
    "Compute Engine list filter expression, such as status = ACTIVE or name eq '^annual-.*'"
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

let commitmentsPath = (client: ComputeEngineClient, region: string, name?: string) =>
  client.projectPath(
    name
      ? `regions/${encodeURIComponent(region)}/commitments/${encodeURIComponent(name)}`
      : `regions/${encodeURIComponent(region)}/commitments`
  );

let mapCommitmentBasicInfo = (commitment: CommitmentBasicInfo) => ({
  name: commitment.name,
  id: commitment.id,
  status: commitment.status,
  statusMessage: commitment.statusMessage,
  plan: commitment.plan,
  category: commitment.category,
  type: commitment.type,
  region: commitment.region,
  selfLink: commitment.selfLink,
  createTime: commitment.creationTimestamp,
  startTime: commitment.startTimestamp,
  endTime: commitment.endTimestamp,
  resources: commitment.resources
});

export let getCommitmentBasicInfo = SlateTool.create(spec, {
  name: 'Get Commitment Basic Info',
  key: 'get_commitment_basic_info',
  description:
    'Get a regional Compute Engine commitment name, ID, status, plan, type, resources, and creation, start, and end timestamps.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ region: regionInput, name: nameInput }))
  .output(commitmentBasicInfoSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let region = resolveComputeEngineRegion(ctx.input.region, client.defaultRegion);
    let commitment = await client.request<CommitmentBasicInfo>('get commitment basic info', {
      method: 'get',
      path: commitmentsPath(client, region, ctx.input.name),
      params: { fields: COMMITMENT_BASIC_FIELDS }
    });

    return {
      output: mapCommitmentBasicInfo(commitment),
      message: `Retrieved basic information for commitment **${commitment.name}** in **${region}**.`
    };
  })
  .build();

export let listCommitments = SlateTool.create(spec, {
  name: 'List Commitments',
  key: 'list_commitments',
  description:
    'List Compute Engine committed-use commitments in a region with status, plan, machine series, resources, and term timestamps.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(
    z.object({
      region: regionInput,
      filter: filterInput,
      pageSize: z
        .number()
        .int()
        .min(0)
        .max(500)
        .optional()
        .describe('Maximum commitments to return, from 0 through 500'),
      pageToken: z.string().optional().describe('Pagination token from a previous call')
    })
  )
  .output(
    z.object({
      commitments: z
        .array(commitmentBasicInfoSchema)
        .describe('Commitments found in the region'),
      nextPageToken: z.string().optional().describe('Token for the next page of commitments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let region = resolveComputeEngineRegion(ctx.input.region, client.defaultRegion);
    let response = await client.request<CommitmentListResponse>('list commitments', {
      method: 'get',
      path: commitmentsPath(client, region),
      params: pickDefined({
        filter: ctx.input.filter,
        maxResults: ctx.input.pageSize,
        pageToken: ctx.input.pageToken,
        fields: COMMITMENT_LIST_FIELDS
      })
    });
    let commitments = (response.items ?? []).map(mapCommitmentBasicInfo);

    return {
      output: {
        commitments,
        nextPageToken: response.nextPageToken
      },
      message: `Found **${commitments.length}** commitment(s) in **${region}**.${response.nextPageToken ? ' More results are available.' : ''}`
    };
  })
  .build();

export let listCommitmentReservations = SlateTool.create(spec, {
  name: 'List Commitment Reservations',
  key: 'list_commitment_reservations',
  description:
    'List the Compute Engine reservations attached to a regional commitment, including machine shape, accelerators, sharing, commitment links, and resource status.',
  tags: {
    readOnly: true
  }
})
  .scopes(computeEngineActionScopes.read)
  .input(z.object({ region: regionInput, name: nameInput }))
  .output(
    z.object({
      reservations: z
        .array(reservationDetailsSchema)
        .describe('Reservations attached to the commitment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let region = resolveComputeEngineRegion(ctx.input.region, client.defaultRegion);
    let commitment = await client.request<CommitmentResponse>('list commitment reservations', {
      method: 'get',
      path: commitmentsPath(client, region, ctx.input.name),
      params: { fields: 'reservations' }
    });
    let reservations = commitment.reservations ?? [];

    return {
      output: { reservations },
      message: `Found **${reservations.length}** reservation(s) attached to commitment **${ctx.input.name}** in **${region}**.`
    };
  })
  .build();
