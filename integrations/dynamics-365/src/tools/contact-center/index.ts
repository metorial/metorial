import { dataverseValidationError } from '@slates/microsoft-dataverse-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../../lib/client';
import { spec } from '../../spec';

let recordSchema = z.record(z.string(), z.any());

let contactCenterResourceTypes = [
  'conversation',
  'session',
  'transcript',
  'agent',
  'queue',
  'routing_state',
  'linked_case'
] as const;

let contactCenterResourceTypeSchema = z.enum(contactCenterResourceTypes);
type ContactCenterResourceType = z.infer<typeof contactCenterResourceTypeSchema>;

let representativeAvailabilityModes = ['for_conversation', 'before_conversation'] as const;
let representativeAvailabilityModeSchema = z.enum(representativeAvailabilityModes);
type RepresentativeAvailabilityMode = z.infer<typeof representativeAvailabilityModeSchema>;

let contactCenterResources: Record<
  ContactCenterResourceType,
  { entitySetName: string; displayName: string; defaultSelect: string[] }
> = {
  conversation: {
    entitySetName: 'msdyn_ocliveworkitems',
    displayName: 'conversations',
    defaultSelect: [
      'activityid',
      'subject',
      'msdyn_channel',
      'msdyn_liveworkstreamid',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  session: {
    entitySetName: 'msdyn_ocsessions',
    displayName: 'sessions',
    defaultSelect: [
      'activityid',
      'subject',
      'msdyn_liveworkitemid',
      'msdyn_sessionid',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  transcript: {
    entitySetName: 'msdyn_transcripts',
    displayName: 'transcripts',
    // File columns such as msdyn_voicetranscript cannot be $select-ed as
    // values; download them through the file column tools instead.
    defaultSelect: [
      'msdyn_transcriptid',
      'msdyn_name',
      'msdyn_transcripturi',
      'msdyn_voicetranscript_name',
      'createdon',
      'modifiedon'
    ]
  },
  agent: {
    entitySetName: 'systemusers',
    displayName: 'agents',
    defaultSelect: [
      'systemuserid',
      'fullname',
      'internalemailaddress',
      'isdisabled',
      'createdon',
      'modifiedon'
    ]
  },
  queue: {
    entitySetName: 'queues',
    displayName: 'queues',
    defaultSelect: ['queueid', 'name', 'emailaddress', 'statecode', 'createdon', 'modifiedon']
  },
  routing_state: {
    entitySetName: 'msdyn_routingrequests',
    displayName: 'routing state records',
    defaultSelect: [
      'msdyn_routingrequestid',
      'msdyn_entitylogicalname',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  linked_case: {
    entitySetName: 'incidents',
    displayName: 'linked cases',
    // customerid is a polymorphic lookup; only its _customerid_value
    // projection is valid inside $select.
    defaultSelect: [
      'incidentid',
      'ticketnumber',
      'title',
      '_customerid_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  }
};

export let resolveResource = (resourceType: ContactCenterResourceType, override?: string) => ({
  ...contactCenterResources[resourceType],
  entitySetName: override?.trim() || contactCenterResources[resourceType].entitySetName
});

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let requireText = (value: string | undefined, label: string) => {
  if (!value?.trim()) {
    throw dataverseValidationError(`${label} is required.`);
  }

  return value.trim();
};

let optionalText = (value: string | undefined) => {
  let trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

let DEFAULT_TRANSCRIPT_ENTITY_SET_NAME = 'msdyn_transcripts';
let DEFAULT_TRANSCRIPT_FILE_COLUMN = 'msdyn_voicetranscript_formatted';
let DEFAULT_TRANSCRIPT_MIME_TYPE = 'text/plain';

let transcriptFileColumnSchema = z
  .string()
  .describe(
    'Transcript file column to download. Official values include msdyn_voicetranscript_formatted, msdyn_voicetranscript, msdyn_rawvoicetranscript, and msdyn_englishtranslatedtranscriptformatted.'
  );

let validateJsonString = (value: string, label: string) => {
  let text = requireText(value, label);

  try {
    JSON.parse(text);
  } catch {
    throw dataverseValidationError(`${label} must be valid JSON.`);
  }

  return text;
};

let jsonStringFromObjectOrText = (
  objectValue: Record<string, unknown> | undefined,
  textValue: string | undefined,
  label: string
) => {
  if (objectValue !== undefined && textValue !== undefined) {
    throw dataverseValidationError(`Use either ${label} or ${label}Json, not both.`);
  }

  if (textValue !== undefined) {
    return validateJsonString(textValue, `${label}Json`);
  }

  if (objectValue !== undefined) {
    return JSON.stringify(objectValue);
  }

  return undefined;
};

let firstRecordValue = (record: Record<string, unknown>, names: string[]) => {
  for (let name of names) {
    if (name in record) return record[name];
  }

  return undefined;
};

let stringRecordValue = (record: Record<string, unknown>, names: string[]) => {
  let value = firstRecordValue(record, names);
  return typeof value === 'string' ? value : undefined;
};

let booleanRecordValue = (record: Record<string, unknown>, names: string[]) => {
  let value = firstRecordValue(record, names);
  return typeof value === 'boolean' ? value : undefined;
};

let numberRecordValue = (record: Record<string, unknown>, names: string[]) => {
  let value = firstRecordValue(record, names);
  return typeof value === 'number' ? value : undefined;
};

let listInputSchema = z.object({
  resourceType: contactCenterResourceTypeSchema.describe(
    'Contact Center record type to query'
  ),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe(
      'Override the default Dataverse entity set name for tenant-specific table naming.'
    ),
  select: z
    .array(z.string())
    .optional()
    .describe('Columns to return. Defaults to core columns for the selected type.'),
  filter: z.string().optional().describe('OData $filter expression'),
  orderBy: z.string().optional().describe('OData $orderby expression'),
  expand: z.string().optional().describe('OData $expand expression'),
  top: z.number().int().positive().optional().describe('OData $top value'),
  pageSize: z.number().int().positive().optional().describe('Preferred Dataverse page size'),
  nextLink: z
    .string()
    .optional()
    .describe('Dataverse @odata.nextLink from a previous response'),
  includeCount: z.boolean().optional().describe('Whether to request @odata.count')
});

let representativeAvailabilityInputSchema = z.object({
  availabilityMode: representativeAvailabilityModeSchema.describe(
    'Use for_conversation when a Contact Center conversation already exists, or before_conversation to check availability for a workstream before starting a conversation.'
  ),
  conversationId: z
    .string()
    .optional()
    .describe('Active conversation GUID. Required when availabilityMode is for_conversation.'),
  liveWorkStreamId: z
    .string()
    .optional()
    .describe('Live workstream GUID. Required when availabilityMode is before_conversation.'),
  apiVersion: z
    .string()
    .optional()
    .describe('Representative availability API version. Defaults to 1.0.'),
  customContextItems: recordSchema
    .optional()
    .describe(
      'Context items used by route-to-queue rules. The object is serialized to the CustomContextItems JSON string expected by Dynamics 365 Contact Center.'
    ),
  customContextItemsJson: z
    .string()
    .optional()
    .describe(
      'Pre-serialized JSON string for CustomContextItems. Do not use together with customContextItems.'
    ),
  channelEngagementContext: recordSchema
    .optional()
    .describe(
      'Before-conversation channel engagement context object. The object is serialized to the ChannelEngagementContext JSON string expected by Dynamics 365 Contact Center.'
    ),
  channelEngagementContextJson: z
    .string()
    .optional()
    .describe(
      'Pre-serialized JSON string for ChannelEngagementContext. Only valid when availabilityMode is before_conversation.'
    )
});

let operationNameForAvailabilityMode = (mode: RepresentativeAvailabilityMode) =>
  mode === 'for_conversation'
    ? 'CCaaS_GetRepresentativeAvailabilityForConversation'
    : 'CCaaS_GetRepresentativeAvailabilityBeforeConversation';

export let buildRepresentativeAvailabilityRequest = (
  input: z.infer<typeof representativeAvailabilityInputSchema>
) => {
  let requestBody: Record<string, unknown> = {
    ApiVersion: optionalText(input.apiVersion) ?? '1.0'
  };
  let request: {
    apiVersion: string;
    conversationId?: string;
    liveWorkStreamId?: string;
  } = {
    apiVersion: requestBody.ApiVersion as string
  };

  if (input.availabilityMode === 'for_conversation') {
    if (optionalText(input.liveWorkStreamId)) {
      throw dataverseValidationError(
        'liveWorkStreamId is only valid when availabilityMode is before_conversation.'
      );
    }
    if (
      input.channelEngagementContext !== undefined ||
      input.channelEngagementContextJson !== undefined
    ) {
      throw dataverseValidationError(
        'channelEngagementContext is only valid when availabilityMode is before_conversation.'
      );
    }

    let conversationId = requireText(input.conversationId, 'conversationId');
    requestBody.ConversationId = conversationId;
    request.conversationId = conversationId;
  } else {
    if (optionalText(input.conversationId)) {
      throw dataverseValidationError(
        'conversationId is only valid when availabilityMode is for_conversation.'
      );
    }

    let liveWorkStreamId = requireText(input.liveWorkStreamId, 'liveWorkStreamId');
    requestBody.LiveWorkStreamId = liveWorkStreamId;
    request.liveWorkStreamId = liveWorkStreamId;
  }

  let customContextItems = jsonStringFromObjectOrText(
    input.customContextItems,
    input.customContextItemsJson,
    'customContextItems'
  );
  if (customContextItems !== undefined) {
    requestBody.CustomContextItems = customContextItems;
  }

  let channelEngagementContext = jsonStringFromObjectOrText(
    input.channelEngagementContext,
    input.channelEngagementContextJson,
    'channelEngagementContext'
  );
  if (channelEngagementContext !== undefined) {
    requestBody.ChannelEngagementContext = channelEngagementContext;
  }

  return {
    operationName: operationNameForAvailabilityMode(input.availabilityMode),
    requestBody,
    request
  };
};

type TranscriptExportInput = {
  transcriptId: string;
  entitySetNameOverride?: string;
  fileColumn?: z.infer<typeof transcriptFileColumnSchema>;
  contentColumn?: string;
  fileName?: string;
  mimeType?: string;
};

export let buildTranscriptExportRequest = (input: TranscriptExportInput) => {
  let transcriptId = requireText(input.transcriptId, 'transcriptId');
  let fileColumnFromInput = optionalText(input.fileColumn);
  let fileColumnFromAlias = optionalText(input.contentColumn);

  if (fileColumnFromInput !== undefined && fileColumnFromAlias !== undefined) {
    throw dataverseValidationError('Use either fileColumn or contentColumn, not both.');
  }

  return {
    transcriptId,
    entitySetName:
      optionalText(input.entitySetNameOverride) ?? DEFAULT_TRANSCRIPT_ENTITY_SET_NAME,
    fileColumn: fileColumnFromInput ?? fileColumnFromAlias ?? DEFAULT_TRANSCRIPT_FILE_COLUMN,
    fileName: optionalText(input.fileName) ?? `transcript-${transcriptId}.txt`,
    mimeType: optionalText(input.mimeType) ?? DEFAULT_TRANSCRIPT_MIME_TYPE
  };
};

let normalizeRepresentativeAvailabilityResponse = (record: Record<string, unknown>) => ({
  queueId: stringRecordValue(record, ['QueueId', 'queueId']),
  isQueueAvailable: booleanRecordValue(record, ['IsQueueAvailable', 'isQueueAvailable']),
  isAgentAvailable: booleanRecordValue(record, ['IsAgentAvailable', 'isAgentAvailable']),
  averageWaitTime: numberRecordValue(record, ['AverageWaitTime', 'averageWaitTime']),
  averageWaitTimeInSeconds: numberRecordValue(record, [
    'AverageWaitTimeInSeconds',
    'averageWaitTimeInSeconds'
  ]),
  numberOfExpertsAvailableInQueue: numberRecordValue(record, [
    'NumberOfExpertsAvailableInQueue',
    'numberOfExpertsAvailableInQueue'
  ]),
  positionInQueue: numberRecordValue(record, ['PositionInQueue', 'positionInQueue']),
  nextTransitionTime: stringRecordValue(record, [
    'NextTransitionTime',
    'nextTransitionTime',
    'nexttransitiontime'
  ]),
  startTimeOfNextOperatingHour: stringRecordValue(record, [
    'StartTimeOfNextOperatingHour',
    'startTimeOfNextOperatingHour'
  ]),
  endTimeOfNextOperatingHour: stringRecordValue(record, [
    'EndTimeOfNextOperatingHour',
    'endTimeOfNextOperatingHour'
  ])
});

export let listContactCenterRecords = SlateTool.create(spec, {
  key: 'list_contact_center_records',
  name: 'List Contact Center Records',
  description:
    'List Dynamics 365 Contact Center conversations, sessions, transcripts, agents, queues, routing state records, and linked cases with Dataverse OData query options.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInputSchema)
  .output(
    z.object({
      resourceType: contactCenterResourceTypeSchema,
      entitySetName: z.string(),
      records: z.array(recordSchema),
      nextLink: z.string().nullable(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let page = await createDynamicsClient(ctx).listRecords(resource.entitySetName, {
      select: ctx.input.select ?? resource.defaultSelect,
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand,
      top: ctx.input.top,
      pageSize: ctx.input.pageSize,
      nextLink: ctx.input.nextLink,
      includeCount: ctx.input.includeCount
    });

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        records: page.records,
        nextLink: page.nextLink,
        count: page.count
      },
      message: `Retrieved **${page.records.length}** Dynamics 365 Contact Center ${resource.displayName}.`
    };
  })
  .build();

export let getContactCenterRecord = SlateTool.create(spec, {
  key: 'get_contact_center_record',
  name: 'Get Contact Center Record',
  description:
    'Retrieve one Dynamics 365 Contact Center conversation, session, transcript, agent, queue, routing state record, or linked case by Dataverse GUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: contactCenterResourceTypeSchema.describe('Contact Center record type'),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordId: z.string().describe('Dataverse record GUID'),
      select: z.array(z.string()).optional().describe('Columns to return'),
      expand: z.string().optional().describe('OData $expand expression')
    })
  )
  .output(
    z.object({
      resourceType: contactCenterResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let record = await createDynamicsClient(ctx).getRecord(
      resource.entitySetName,
      ctx.input.recordId,
      {
        select: ctx.input.select ?? resource.defaultSelect,
        expand: ctx.input.expand
      }
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        record
      },
      message: `Retrieved Dynamics 365 Contact Center ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let exportConversationTranscript = SlateTool.create(spec, {
  key: 'export_conversation_transcript',
  name: 'Export Conversation Transcript',
  description:
    'Download a Dynamics 365 Contact Center transcript Dataverse file column as a Slate attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      transcriptId: z.string().describe('Transcript record GUID'),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Transcript entity set name. Defaults to msdyn_transcripts.'),
      fileColumn: transcriptFileColumnSchema
        .optional()
        .describe(
          'Transcript file column to download. Defaults to msdyn_voicetranscript_formatted.'
        ),
      contentColumn: z
        .string()
        .optional()
        .describe(
          'Deprecated alias for fileColumn. Use only for tenant-specific transcript file columns.'
        ),
      fileName: z
        .string()
        .optional()
        .describe('Attachment filename. Defaults to transcript-<id>.txt.'),
      mimeType: z
        .string()
        .optional()
        .describe('Attachment MIME type fallback. Defaults to text/plain.'),
      select: z
        .array(z.string())
        .optional()
        .describe(
          'Deprecated and ignored. Transcript export downloads the file column through Dataverse $value.'
        )
    })
  )
  .output(
    z.object({
      transcriptId: z.string(),
      entitySetName: z.string(),
      fileColumn: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number(),
      attachmentCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let request = buildTranscriptExportRequest(ctx.input);
    let download = await createDynamicsClient(ctx).downloadFileColumn({
      entitySetName: request.entitySetName,
      recordId: request.transcriptId,
      columnName: request.fileColumn,
      fileName: request.fileName,
      mimeType: request.mimeType
    });

    return {
      output: {
        transcriptId: request.transcriptId,
        entitySetName: request.entitySetName,
        fileColumn: request.fileColumn,
        fileName: download.metadata.fileName ?? request.fileName,
        mimeType: download.metadata.mimeType ?? request.mimeType,
        sizeBytes: download.metadata.sizeBytes,
        attachmentCount: download.metadata.attachmentCount
      },
      message: `Exported transcript **${request.transcriptId}** from **${request.fileColumn}**.`,
      attachments: [download.attachment]
    };
  })
  .build();

export let getRepresentativeAvailability = SlateTool.create(spec, {
  key: 'get_representative_availability',
  name: 'Get Representative Availability',
  description:
    'Check Dynamics 365 Contact Center queue and service representative availability for an active conversation or before starting a conversation for a live workstream.',
  tags: { readOnly: true, destructive: false }
})
  .input(representativeAvailabilityInputSchema)
  .output(
    z.object({
      availabilityMode: representativeAvailabilityModeSchema,
      operationName: z.string(),
      request: z.object({
        apiVersion: z.string(),
        conversationId: z.string().optional(),
        liveWorkStreamId: z.string().optional()
      }),
      availability: recordSchema,
      queueId: z.string().optional(),
      isQueueAvailable: z.boolean().optional(),
      isAgentAvailable: z.boolean().optional(),
      averageWaitTime: z.number().optional(),
      averageWaitTimeInSeconds: z.number().optional(),
      numberOfExpertsAvailableInQueue: z.number().optional(),
      positionInQueue: z.number().optional(),
      nextTransitionTime: z.string().optional(),
      startTimeOfNextOperatingHour: z.string().optional(),
      endTimeOfNextOperatingHour: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { operationName, requestBody, request } = buildRepresentativeAvailabilityRequest(
      ctx.input
    );
    let response = await createDynamicsClient(ctx).invokeOperation({
      operationType: 'action',
      bindingType: 'unbound',
      operationName,
      requestBody
    });

    if (!isRecord(response)) {
      throw dataverseValidationError(
        'Representative availability API returned an unsupported response.'
      );
    }

    let availability = normalizeRepresentativeAvailabilityResponse(response);

    return {
      output: {
        availabilityMode: ctx.input.availabilityMode,
        operationName,
        request,
        availability: response,
        ...availability
      },
      message: `Retrieved Dynamics 365 Contact Center representative availability with **${operationName}**.`
    };
  })
  .build();
