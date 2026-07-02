import {
  dataverseValidationError,
  normalizeDataverseGuid
} from '@slates/microsoft-dataverse-recipes';
import { SlateTool, setIfDefined } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../../lib/client';
import { spec } from '../../spec';

let recordSchema = z.record(z.string(), z.any());

let fieldServiceResourceTypes = [
  'work_order',
  'booking',
  'resource',
  'customer_asset',
  'service_account',
  'incident_type',
  'work_order_incident',
  'work_order_product',
  'work_order_service',
  'work_order_service_task',
  'resource_requirement',
  'booking_status',
  'work_order_type',
  'priority',
  'product',
  'service'
] as const;

let fieldServiceResourceTypeSchema = z.enum(fieldServiceResourceTypes);
type FieldServiceResourceType = z.infer<typeof fieldServiceResourceTypeSchema>;

let fieldServiceResources: Record<
  FieldServiceResourceType,
  { entitySetName: string; displayName: string; defaultSelect: string[] }
> = {
  work_order: {
    entitySetName: 'msdyn_workorders',
    displayName: 'work orders',
    defaultSelect: [
      'msdyn_workorderid',
      'msdyn_name',
      'msdyn_systemstatus',
      '_msdyn_serviceaccount_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  booking: {
    entitySetName: 'bookableresourcebookings',
    displayName: 'bookings',
    defaultSelect: [
      'bookableresourcebookingid',
      'name',
      'starttime',
      'endtime',
      'duration',
      '_resource_value',
      '_bookingstatus_value',
      '_msdyn_workorder_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  resource: {
    entitySetName: 'bookableresources',
    displayName: 'bookable resources',
    defaultSelect: [
      'bookableresourceid',
      'name',
      'resourcetype',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  customer_asset: {
    entitySetName: 'msdyn_customerassets',
    displayName: 'customer assets',
    defaultSelect: [
      'msdyn_customerassetid',
      'msdyn_name',
      '_msdyn_account_value',
      '_msdyn_product_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  service_account: {
    entitySetName: 'accounts',
    displayName: 'service accounts',
    defaultSelect: [
      'accountid',
      'name',
      'accountnumber',
      'telephone1',
      'address1_city',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  incident_type: {
    entitySetName: 'msdyn_incidenttypes',
    displayName: 'incident types',
    defaultSelect: [
      'msdyn_incidenttypeid',
      'msdyn_name',
      'msdyn_estimatedduration',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  work_order_incident: {
    entitySetName: 'msdyn_workorderincidents',
    displayName: 'work order incidents',
    defaultSelect: [
      'msdyn_workorderincidentid',
      'msdyn_name',
      '_msdyn_workorder_value',
      '_msdyn_incidenttype_value',
      '_msdyn_customerasset_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  work_order_product: {
    entitySetName: 'msdyn_workorderproducts',
    displayName: 'work order products',
    defaultSelect: [
      'msdyn_workorderproductid',
      'msdyn_name',
      '_msdyn_workorder_value',
      '_msdyn_product_value',
      'msdyn_quantity',
      'msdyn_estimatequantity',
      'msdyn_linestatus',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  work_order_service: {
    entitySetName: 'msdyn_workorderservices',
    displayName: 'work order services',
    defaultSelect: [
      'msdyn_workorderserviceid',
      'msdyn_name',
      '_msdyn_workorder_value',
      '_msdyn_service_value',
      'msdyn_estimateduration',
      'msdyn_duration',
      'msdyn_linestatus',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  work_order_service_task: {
    entitySetName: 'msdyn_workorderservicetasks',
    displayName: 'work order service tasks',
    defaultSelect: [
      'msdyn_workorderservicetaskid',
      'msdyn_name',
      '_msdyn_workorder_value',
      '_msdyn_tasktype_value',
      'msdyn_estimatedduration',
      'msdyn_percentcomplete',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  resource_requirement: {
    entitySetName: 'msdyn_resourcerequirements',
    displayName: 'resource requirements',
    defaultSelect: [
      'msdyn_resourcerequirementid',
      'msdyn_name',
      '_msdyn_workorder_value',
      '_msdyn_priority_value',
      'msdyn_fromdate',
      'msdyn_todate',
      'msdyn_duration',
      'msdyn_remainingduration',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  booking_status: {
    entitySetName: 'bookingstatuses',
    displayName: 'booking statuses',
    defaultSelect: [
      'bookingstatusid',
      'name',
      'status',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  work_order_type: {
    entitySetName: 'msdyn_workordertypes',
    displayName: 'work order types',
    defaultSelect: [
      'msdyn_workordertypeid',
      'msdyn_name',
      '_msdyn_pricelist_value',
      'msdyn_incidentrequired',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  priority: {
    entitySetName: 'msdyn_priorities',
    displayName: 'priorities',
    defaultSelect: [
      'msdyn_priorityid',
      'msdyn_name',
      'msdyn_priorityvalue',
      'msdyn_levelofimportance',
      'msdyn_prioritycolor',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  product: {
    entitySetName: 'products',
    displayName: 'products',
    defaultSelect: [
      'productid',
      'name',
      'productnumber',
      'price',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  service: {
    entitySetName: 'services',
    displayName: 'services',
    defaultSelect: [
      'serviceid',
      'name',
      'duration',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  }
};

let workOrderSystemStatuses = {
  unscheduled: 690970000,
  scheduled: 690970001,
  in_progress: 690970002,
  completed: 690970003,
  posted: 690970004,
  canceled: 690970005
} as const;

let workOrderLifecycleStatusByAction = {
  mark_unscheduled: workOrderSystemStatuses.unscheduled,
  mark_scheduled: workOrderSystemStatuses.scheduled,
  mark_in_progress: workOrderSystemStatuses.in_progress,
  mark_completed: workOrderSystemStatuses.completed
} as const;

let unsupportedWorkOrderSystemStatuses = new Map<number, string>([
  [workOrderSystemStatuses.posted, 'posted'],
  [workOrderSystemStatuses.canceled, 'canceled']
]);

let resolveResource = (resourceType: FieldServiceResourceType, override?: string) => ({
  ...fieldServiceResources[resourceType],
  entitySetName: override?.trim() || fieldServiceResources[resourceType].entitySetName
});

let requireText = (value: string | undefined, label: string) => {
  if (!value?.trim()) {
    throw dataverseValidationError(`${label} is required.`);
  }

  return value.trim();
};

let hasKeys = (value: Record<string, unknown>) => Object.keys(value).length > 0;

let bind = (navigationProperty: string, entitySetName: string, recordId: string) =>
  `/${entitySetName}(${normalizeDataverseGuid(requireText(recordId, `${navigationProperty} record ID`))})`;

let parseTimestamp = (value: string, label: string) => {
  let text = requireText(value, label);
  let timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) {
    throw dataverseValidationError(`${label} must be a valid date/time string.`);
  }

  return { text, timestamp };
};

let bookingDurationMinutes = (
  startTime: string,
  endTime: string,
  durationMinutes: number | undefined
) => {
  let start = parseTimestamp(startTime, 'startTime');
  let end = parseTimestamp(endTime, 'endTime');
  if (end.timestamp <= start.timestamp) {
    throw dataverseValidationError('endTime must be later than startTime.');
  }

  if (durationMinutes !== undefined) return durationMinutes;

  return Math.ceil((end.timestamp - start.timestamp) / 60_000);
};

let listInputSchema = z.object({
  resourceType: fieldServiceResourceTypeSchema.describe('Field Service record type to query'),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe('Override the default Dataverse entity set name.'),
  select: z
    .array(z.string())
    .optional()
    .describe('Columns to return. Defaults to core columns for the selected type.'),
  filter: z.string().optional().describe('OData $filter expression'),
  orderBy: z.string().optional().describe('OData $orderby expression'),
  expand: z.string().optional().describe('OData $expand expression'),
  top: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('OData $top value. Do not combine with pageSize or nextLink.'),
  pageSize: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Preferred Dataverse page size. Do not combine with top.'),
  nextLink: z
    .string()
    .optional()
    .describe(
      'Dataverse @odata.nextLink from a previous response. Use it unchanged without select, filter, orderBy, expand, top, or includeCount.'
    ),
  includeCount: z.boolean().optional().describe('Whether to request @odata.count')
});

let validateListInput = (input: z.infer<typeof listInputSchema>) => {
  if (input.top !== undefined && input.pageSize !== undefined) {
    throw dataverseValidationError(
      'Do not combine top and pageSize. Dataverse ignores $top when the odata.maxpagesize preference is used.'
    );
  }

  if (input.nextLink === undefined) return undefined;

  let nextLink = requireText(input.nextLink, 'nextLink');
  let incompatibleFields = [
    input.select !== undefined ? 'select' : undefined,
    input.filter !== undefined ? 'filter' : undefined,
    input.orderBy !== undefined ? 'orderBy' : undefined,
    input.expand !== undefined ? 'expand' : undefined,
    input.top !== undefined ? 'top' : undefined,
    input.includeCount === true ? 'includeCount' : undefined
  ].filter((field): field is string => field !== undefined);

  if (incompatibleFields.length > 0) {
    throw dataverseValidationError(
      `nextLink must be used without additional query options. Remove ${incompatibleFields.join(', ')} and pass the Dataverse @odata.nextLink value unchanged.`
    );
  }

  return nextLink;
};

let recordRefInput = z.object({
  resourceType: fieldServiceResourceTypeSchema.describe('Field Service record type'),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe('Override the default Dataverse entity set name.'),
  recordId: z.string().describe('Dataverse record GUID'),
  select: z.array(z.string()).optional().describe('Columns to return'),
  expand: z.string().optional().describe('OData $expand expression')
});

export let listFieldServiceRecords = SlateTool.create(spec, {
  key: 'list_field_service_records',
  name: 'List Field Service Records',
  description:
    'List Dynamics 365 Field Service work orders, bookings, resources, customer assets, service accounts, incident types, work-order child records, booking statuses, products, and services with Dataverse OData query options.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInputSchema)
  .output(
    z.object({
      resourceType: fieldServiceResourceTypeSchema,
      entitySetName: z.string(),
      records: z.array(recordSchema),
      nextLink: z.string().nullable(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let nextLink = validateListInput(ctx.input);
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let page = await createDynamicsClient(ctx).listRecords(resource.entitySetName, {
      select: ctx.input.select ?? resource.defaultSelect,
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      expand: ctx.input.expand,
      top: ctx.input.top,
      pageSize: ctx.input.pageSize,
      nextLink,
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
      message: `Retrieved **${page.records.length}** Dynamics 365 Field Service ${resource.displayName}.`
    };
  })
  .build();

export let getFieldServiceRecord = SlateTool.create(spec, {
  key: 'get_field_service_record',
  name: 'Get Field Service Record',
  description:
    'Retrieve one Dynamics 365 Field Service work order, booking, resource, customer asset, service account, incident type, work-order child record, booking status, product, or service by Dataverse GUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(recordRefInput)
  .output(
    z.object({
      resourceType: fieldServiceResourceTypeSchema,
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
      message: `Retrieved Dynamics 365 Field Service ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let createFieldServiceRecord = SlateTool.create(spec, {
  key: 'create_field_service_record',
  name: 'Create Field Service Record',
  description:
    'Create a Dynamics 365 Field Service work order, booking, resource, customer asset, service account, incident type, work-order child record, booking status, product, or service record.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      resourceType: fieldServiceResourceTypeSchema.describe(
        'Field Service record type to create'
      ),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordData: recordSchema.describe(
        'Dataverse column values for the new record, including @odata.bind lookups.'
      ),
      returnRepresentation: z
        .boolean()
        .optional()
        .describe('Whether to return the created record representation. Defaults to true.')
    })
  )
  .output(
    z.object({
      resourceType: fieldServiceResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    let record = await createDynamicsClient(ctx).createRecord(
      resource.entitySetName,
      ctx.input.recordData,
      {
        returnRepresentation: ctx.input.returnRepresentation
      }
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        record
      },
      message: `Created a Dynamics 365 Field Service ${resource.displayName} record.`
    };
  })
  .build();

export let updateFieldServiceRecord = SlateTool.create(spec, {
  key: 'update_field_service_record',
  name: 'Update Field Service Record',
  description:
    'Update selected columns on a Dynamics 365 Field Service work order, booking, resource, customer asset, service account, incident type, work-order child record, booking status, product, or service.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      resourceType: fieldServiceResourceTypeSchema.describe(
        'Field Service record type to update'
      ),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordId: z.string().describe('Dataverse record GUID'),
      recordData: recordSchema.describe(
        'Dataverse column values to patch. Use null to clear nullable columns.'
      ),
      returnRepresentation: z
        .boolean()
        .optional()
        .describe('Whether to return the updated record representation. Defaults to true.')
    })
  )
  .output(
    z.object({
      resourceType: fieldServiceResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveResource(ctx.input.resourceType, ctx.input.entitySetNameOverride);
    if (!hasKeys(ctx.input.recordData)) {
      throw dataverseValidationError(
        'recordData must include at least one column for update_field_service_record.'
      );
    }

    let record = await createDynamicsClient(ctx).updateRecord(
      resource.entitySetName,
      ctx.input.recordId,
      ctx.input.recordData,
      {
        returnRepresentation: ctx.input.returnRepresentation,
        preventCreate: true
      }
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        record
      },
      message: `Updated Dynamics 365 Field Service ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let scheduleBooking = SlateTool.create(spec, {
  key: 'schedule_booking',
  name: 'Schedule Booking',
  description:
    'Create a Dynamics 365 Field Service bookable resource booking for a work order with typed resource, booking status, duration, and time fields.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      workOrderId: z.string().describe('Work order GUID to schedule'),
      resourceId: z.string().describe('Bookable resource GUID'),
      startTime: z.string().describe('Booking start timestamp'),
      endTime: z.string().describe('Booking end timestamp'),
      durationMinutes: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Booking duration in minutes. Defaults to the start/end difference.'),
      bookingStatusId: z.string().describe('Booking status GUID'),
      bookingType: z
        .number()
        .int()
        .optional()
        .describe('Booking type option value. Defaults to 1.'),
      resourceRequirementId: z
        .string()
        .optional()
        .describe('Optional resource requirement GUID to relate to the booking.'),
      name: z.string().optional().describe('Booking name'),
      workOrderNavigationProperty: z
        .string()
        .optional()
        .describe('Work order lookup navigation property. Defaults to msdyn_workorder.'),
      resourceNavigationProperty: z
        .string()
        .optional()
        .describe('Resource lookup navigation property. Defaults to Resource.'),
      bookingStatusNavigationProperty: z
        .string()
        .optional()
        .describe('Booking status lookup navigation property. Defaults to BookingStatus.'),
      resourceRequirementNavigationProperty: z
        .string()
        .optional()
        .describe(
          'Resource requirement lookup navigation property. Defaults to msdyn_ResourceRequirement.'
        ),
      additionalFields: recordSchema
        .optional()
        .describe('Additional bookable resource booking columns.')
    })
  )
  .output(
    z.object({
      bookingId: z.string().optional(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let data: Record<string, unknown> = { ...(ctx.input.additionalFields ?? {}) };
    setIfDefined(data, 'name', ctx.input.name);
    data.starttime = parseTimestamp(ctx.input.startTime, 'startTime').text;
    data.endtime = parseTimestamp(ctx.input.endTime, 'endTime').text;
    data.duration = bookingDurationMinutes(
      ctx.input.startTime,
      ctx.input.endTime,
      ctx.input.durationMinutes
    );
    data.bookingtype = ctx.input.bookingType ?? 1;
    data[`${ctx.input.workOrderNavigationProperty ?? 'msdyn_workorder'}@odata.bind`] = bind(
      ctx.input.workOrderNavigationProperty ?? 'msdyn_workorder',
      'msdyn_workorders',
      ctx.input.workOrderId
    );
    data[`${ctx.input.resourceNavigationProperty ?? 'Resource'}@odata.bind`] = bind(
      ctx.input.resourceNavigationProperty ?? 'Resource',
      'bookableresources',
      ctx.input.resourceId
    );
    data[`${ctx.input.bookingStatusNavigationProperty ?? 'BookingStatus'}@odata.bind`] = bind(
      ctx.input.bookingStatusNavigationProperty ?? 'BookingStatus',
      'bookingstatuses',
      ctx.input.bookingStatusId
    );
    if (ctx.input.resourceRequirementId !== undefined) {
      data[
        `${ctx.input.resourceRequirementNavigationProperty ?? 'msdyn_ResourceRequirement'}@odata.bind`
      ] = bind(
        ctx.input.resourceRequirementNavigationProperty ?? 'msdyn_ResourceRequirement',
        'msdyn_resourcerequirements',
        ctx.input.resourceRequirementId
      );
    }

    let record = await createDynamicsClient(ctx).createRecord(
      'bookableresourcebookings',
      data,
      { returnRepresentation: true }
    );

    return {
      output: {
        bookingId:
          typeof record.bookableresourcebookingid === 'string'
            ? record.bookableresourcebookingid
            : undefined,
        record
      },
      message: 'Scheduled a Dynamics 365 Field Service booking.'
    };
  })
  .build();

export let updateBooking = SlateTool.create(spec, {
  key: 'update_booking',
  name: 'Update Booking',
  description:
    'Update a Dynamics 365 Field Service bookable resource booking time, duration, resource, status, resource requirement, or custom fields.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      bookingId: z.string().describe('Bookable resource booking GUID'),
      resourceId: z.string().optional().describe('New bookable resource GUID'),
      startTime: z.string().optional().describe('New booking start timestamp'),
      endTime: z.string().optional().describe('New booking end timestamp'),
      durationMinutes: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'New booking duration in minutes. When omitted, start/end updates compute it.'
        ),
      bookingStatusId: z.string().optional().describe('New booking status GUID'),
      resourceRequirementId: z.string().optional().describe('New resource requirement GUID'),
      resourceNavigationProperty: z
        .string()
        .optional()
        .describe('Resource lookup navigation property. Defaults to Resource.'),
      bookingStatusNavigationProperty: z
        .string()
        .optional()
        .describe('Booking status lookup navigation property. Defaults to BookingStatus.'),
      resourceRequirementNavigationProperty: z
        .string()
        .optional()
        .describe(
          'Resource requirement lookup navigation property. Defaults to msdyn_ResourceRequirement.'
        ),
      additionalFields: recordSchema
        .optional()
        .describe('Additional booking columns to update.')
    })
  )
  .output(
    z.object({
      bookingId: z.string(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let data: Record<string, unknown> = { ...(ctx.input.additionalFields ?? {}) };
    if (ctx.input.startTime !== undefined) {
      data.starttime = parseTimestamp(ctx.input.startTime, 'startTime').text;
    }
    if (ctx.input.endTime !== undefined) {
      data.endtime = parseTimestamp(ctx.input.endTime, 'endTime').text;
    }

    if (ctx.input.startTime !== undefined && ctx.input.endTime !== undefined) {
      data.duration = bookingDurationMinutes(
        ctx.input.startTime,
        ctx.input.endTime,
        ctx.input.durationMinutes
      );
    } else if (ctx.input.durationMinutes !== undefined) {
      data.duration = ctx.input.durationMinutes;
    }

    if (ctx.input.resourceId !== undefined) {
      data[`${ctx.input.resourceNavigationProperty ?? 'Resource'}@odata.bind`] = bind(
        ctx.input.resourceNavigationProperty ?? 'Resource',
        'bookableresources',
        ctx.input.resourceId
      );
    }
    if (ctx.input.bookingStatusId !== undefined) {
      data[`${ctx.input.bookingStatusNavigationProperty ?? 'BookingStatus'}@odata.bind`] =
        bind(
          ctx.input.bookingStatusNavigationProperty ?? 'BookingStatus',
          'bookingstatuses',
          ctx.input.bookingStatusId
        );
    }
    if (ctx.input.resourceRequirementId !== undefined) {
      data[
        `${ctx.input.resourceRequirementNavigationProperty ?? 'msdyn_ResourceRequirement'}@odata.bind`
      ] = bind(
        ctx.input.resourceRequirementNavigationProperty ?? 'msdyn_ResourceRequirement',
        'msdyn_resourcerequirements',
        ctx.input.resourceRequirementId
      );
    }

    if (!hasKeys(data)) {
      throw dataverseValidationError(
        'At least one booking field is required for update_booking.'
      );
    }

    let record = await createDynamicsClient(ctx).updateRecord(
      'bookableresourcebookings',
      ctx.input.bookingId,
      data,
      { returnRepresentation: true, preventCreate: true }
    );

    return {
      output: {
        bookingId: ctx.input.bookingId,
        record
      },
      message: `Updated Field Service booking **${ctx.input.bookingId}**.`
    };
  })
  .build();

export let manageWorkOrderLifecycle = SlateTool.create(spec, {
  key: 'manage_work_order_lifecycle',
  name: 'Manage Work Order Lifecycle',
  description:
    'Set a Dynamics 365 Field Service work order system status and optional Dataverse state/status fields.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      lifecycleAction: z
        .enum([
          'set_system_status',
          'mark_unscheduled',
          'mark_scheduled',
          'mark_in_progress',
          'mark_completed'
        ])
        .describe('Work order lifecycle operation to perform'),
      workOrderId: z.string().describe('Work order GUID'),
      systemStatus: z
        .number()
        .int()
        .optional()
        .describe('Field Service msdyn_systemstatus value. Required for set_system_status.'),
      stateCode: z.number().int().optional().describe('Optional Dataverse statecode to set'),
      statusCode: z.number().int().optional().describe('Optional Dataverse statuscode to set'),
      additionalFields: recordSchema
        .optional()
        .describe('Additional work order columns to update.')
    })
  )
  .output(
    z.object({
      lifecycleAction: z.string(),
      workOrderId: z.string(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let systemStatus = ctx.input.systemStatus;
    if (ctx.input.lifecycleAction !== 'set_system_status') {
      systemStatus = workOrderLifecycleStatusByAction[ctx.input.lifecycleAction];
    }
    if (systemStatus === undefined) {
      throw dataverseValidationError(
        'systemStatus is required when lifecycleAction is set_system_status.'
      );
    }
    let unsupportedStatusLabel = unsupportedWorkOrderSystemStatuses.get(systemStatus);
    if (unsupportedStatusLabel) {
      throw dataverseValidationError(
        `The ${unsupportedStatusLabel} work-order transition is not supported until live E2E coverage exists.`
      );
    }
    if (ctx.input.stateCode !== undefined && ctx.input.statusCode === undefined) {
      throw dataverseValidationError(
        'statusCode is required when stateCode is provided for manage_work_order_lifecycle.'
      );
    }

    let data: Record<string, unknown> = {
      ...(ctx.input.additionalFields ?? {}),
      msdyn_systemstatus: systemStatus
    };
    setIfDefined(data, 'statecode', ctx.input.stateCode);
    setIfDefined(data, 'statuscode', ctx.input.statusCode);

    let record = await createDynamicsClient(ctx).updateRecord(
      'msdyn_workorders',
      ctx.input.workOrderId,
      data,
      { returnRepresentation: true, preventCreate: true }
    );

    return {
      output: {
        lifecycleAction: ctx.input.lifecycleAction,
        workOrderId: ctx.input.workOrderId,
        record
      },
      message: `Updated Field Service work order **${ctx.input.workOrderId}** lifecycle.`
    };
  })
  .build();
