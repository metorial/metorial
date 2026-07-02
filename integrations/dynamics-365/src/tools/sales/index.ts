import { dataverseValidationError } from '@slates/microsoft-dataverse-recipes';
import { SlateTool, setIfDefined } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../../lib/client';
import { spec } from '../../spec';

let recordSchema = z.record(z.string(), z.any());

let salesResourceTypes = [
  'account',
  'contact',
  'lead',
  'opportunity',
  'task',
  'phone_call',
  'appointment',
  'email',
  'quote',
  'order'
] as const;

let salesResourceTypeSchema = z.enum(salesResourceTypes);
type SalesResourceType = z.infer<typeof salesResourceTypeSchema>;

let salesResources: Record<
  SalesResourceType,
  { entitySetName: string; displayName: string; defaultSelect: string[] }
> = {
  account: {
    entitySetName: 'accounts',
    displayName: 'accounts',
    defaultSelect: [
      'accountid',
      'name',
      'accountnumber',
      'telephone1',
      'websiteurl',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  contact: {
    entitySetName: 'contacts',
    displayName: 'contacts',
    defaultSelect: [
      'contactid',
      'fullname',
      'emailaddress1',
      'telephone1',
      '_parentcustomerid_value',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  lead: {
    entitySetName: 'leads',
    displayName: 'leads',
    defaultSelect: [
      'leadid',
      'fullname',
      'subject',
      'companyname',
      'emailaddress1',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  opportunity: {
    entitySetName: 'opportunities',
    displayName: 'opportunities',
    defaultSelect: [
      'opportunityid',
      'name',
      '_customerid_value',
      'estimatedvalue',
      'estimatedclosedate',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  task: {
    entitySetName: 'tasks',
    displayName: 'tasks',
    defaultSelect: [
      'activityid',
      'subject',
      'scheduledend',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  phone_call: {
    entitySetName: 'phonecalls',
    displayName: 'phone calls',
    defaultSelect: [
      'activityid',
      'subject',
      'phonenumber',
      'scheduledend',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  appointment: {
    entitySetName: 'appointments',
    displayName: 'appointments',
    defaultSelect: [
      'activityid',
      'subject',
      'scheduledstart',
      'scheduledend',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  email: {
    entitySetName: 'emails',
    displayName: 'emails',
    defaultSelect: [
      'activityid',
      'subject',
      'actualend',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  quote: {
    entitySetName: 'quotes',
    displayName: 'quotes',
    defaultSelect: [
      'quoteid',
      'name',
      'quotenumber',
      '_customerid_value',
      'totalamount',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  },
  order: {
    entitySetName: 'salesorders',
    displayName: 'orders',
    defaultSelect: [
      'salesorderid',
      'name',
      'ordernumber',
      '_customerid_value',
      'totalamount',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]
  }
};

let resolveSalesResource = (resourceType: SalesResourceType, override?: string) => ({
  ...salesResources[resourceType],
  entitySetName: override?.trim() || salesResources[resourceType].entitySetName
});

let requireText = (value: string | undefined, label: string) => {
  if (!value?.trim()) {
    throw dataverseValidationError(`${label} is required.`);
  }

  return value.trim();
};

let hasKeys = (value: Record<string, unknown>) => Object.keys(value).length > 0;

let listInputSchema = z.object({
  resourceType: salesResourceTypeSchema.describe('Sales record type to query'),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe('Override the default Dataverse entity set name for custom table naming.'),
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

let recordRefInput = z.object({
  resourceType: salesResourceTypeSchema.describe('Sales record type'),
  entitySetNameOverride: z
    .string()
    .optional()
    .describe('Override the default Dataverse entity set name.'),
  recordId: z.string().describe('Dataverse record GUID'),
  select: z.array(z.string()).optional().describe('Columns to return'),
  expand: z.string().optional().describe('OData $expand expression')
});

export let listSalesRecords = SlateTool.create(spec, {
  key: 'list_sales_records',
  name: 'List Sales Records',
  description:
    'List Dynamics 365 Sales accounts, contacts, leads, opportunities, activities, quotes, and orders with Dataverse OData query options.',
  tags: { readOnly: true, destructive: false }
})
  .input(listInputSchema)
  .output(
    z.object({
      resourceType: salesResourceTypeSchema,
      entitySetName: z.string(),
      records: z.array(recordSchema),
      nextLink: z.string().nullable(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveSalesResource(
      ctx.input.resourceType,
      ctx.input.entitySetNameOverride
    );
    if (
      ctx.input.top !== undefined &&
      ctx.input.pageSize !== undefined &&
      !ctx.input.nextLink
    ) {
      throw dataverseValidationError(
        'Use either top or pageSize for list_sales_records. Dataverse ignores $top when pageSize sends the odata.maxpagesize preference.'
      );
    }

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
      message: `Retrieved **${page.records.length}** Dynamics 365 Sales ${resource.displayName}.`
    };
  })
  .build();

export let getSalesRecord = SlateTool.create(spec, {
  key: 'get_sales_record',
  name: 'Get Sales Record',
  description:
    'Retrieve one Dynamics 365 Sales account, contact, lead, opportunity, activity, quote, or order by Dataverse GUID.',
  tags: { readOnly: true, destructive: false }
})
  .input(recordRefInput)
  .output(
    z.object({
      resourceType: salesResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveSalesResource(
      ctx.input.resourceType,
      ctx.input.entitySetNameOverride
    );
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
      message: `Retrieved Dynamics 365 Sales ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let createSalesRecord = SlateTool.create(spec, {
  key: 'create_sales_record',
  name: 'Create Sales Record',
  description:
    'Create a Dynamics 365 Sales account, contact, lead, opportunity, activity, quote, or order record through Dataverse.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      resourceType: salesResourceTypeSchema.describe('Sales record type to create'),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordData: recordSchema.describe(
        'Dataverse column values for the new record, including @odata.bind lookups.'
      ),
      detectDuplicates: z
        .boolean()
        .optional()
        .describe('Ask Dataverse duplicate detection to run when enabled.'),
      returnRepresentation: z
        .boolean()
        .optional()
        .describe('Whether to return the created record representation. Defaults to true.')
    })
  )
  .output(
    z.object({
      resourceType: salesResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveSalesResource(
      ctx.input.resourceType,
      ctx.input.entitySetNameOverride
    );
    let record = await createDynamicsClient(ctx).createRecord(
      resource.entitySetName,
      ctx.input.recordData,
      {
        detectDuplicates: ctx.input.detectDuplicates,
        returnRepresentation: ctx.input.returnRepresentation
      }
    );

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        record
      },
      message: `Created a Dynamics 365 Sales ${resource.displayName} record.`
    };
  })
  .build();

export let updateSalesRecord = SlateTool.create(spec, {
  key: 'update_sales_record',
  name: 'Update Sales Record',
  description:
    'Update selected columns on a Dynamics 365 Sales account, contact, lead, opportunity, activity, quote, or order record.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      resourceType: salesResourceTypeSchema.describe('Sales record type to update'),
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
      resourceType: salesResourceTypeSchema,
      entitySetName: z.string(),
      record: recordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveSalesResource(
      ctx.input.resourceType,
      ctx.input.entitySetNameOverride
    );
    if (!hasKeys(ctx.input.recordData)) {
      throw dataverseValidationError(
        'recordData must include at least one column for update_sales_record.'
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
      message: `Updated Dynamics 365 Sales ${resource.displayName} record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let deleteSalesRecord = SlateTool.create(spec, {
  key: 'delete_sales_record',
  name: 'Delete Sales Record',
  description:
    'Permanently delete a Dynamics 365 Sales account, contact, lead, opportunity, activity, quote, or order record by Dataverse GUID.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      resourceType: salesResourceTypeSchema.describe('Sales record type to delete'),
      entitySetNameOverride: z
        .string()
        .optional()
        .describe('Override the default Dataverse entity set name.'),
      recordId: z.string().describe('Dataverse record GUID')
    })
  )
  .output(
    z.object({
      resourceType: salesResourceTypeSchema,
      entitySetName: z.string(),
      recordId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let resource = resolveSalesResource(
      ctx.input.resourceType,
      ctx.input.entitySetNameOverride
    );
    let recordId = requireText(ctx.input.recordId, 'recordId');

    await createDynamicsClient(ctx).deleteRecord(resource.entitySetName, recordId);

    return {
      output: {
        resourceType: ctx.input.resourceType,
        entitySetName: resource.entitySetName,
        recordId,
        deleted: true
      },
      message: `Deleted Dynamics 365 Sales ${resource.displayName} record **${recordId}**.`
    };
  })
  .build();

export let qualifyLead = SlateTool.create(spec, {
  key: 'qualify_lead',
  name: 'Qualify Lead',
  description:
    'Qualify a Dynamics 365 Sales lead with typed controls for creating account, contact, and opportunity records.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      leadId: z.string().describe('Lead GUID to qualify'),
      createAccount: z
        .boolean()
        .optional()
        .describe('Whether Dataverse should create an account from the lead'),
      createContact: z
        .boolean()
        .optional()
        .describe('Whether Dataverse should create a contact from the lead'),
      createOpportunity: z
        .boolean()
        .optional()
        .describe('Whether Dataverse should create an opportunity from the lead'),
      statusCode: z
        .number()
        .int()
        .describe('Lead status reason to apply during qualification'),
      suppressDuplicateDetection: z
        .boolean()
        .optional()
        .describe('Whether to suppress duplicate detection'),
      additionalParameters: recordSchema
        .optional()
        .describe(
          'Additional Dataverse QualifyLead action parameters for tenant-specific columns.'
        )
    })
  )
  .output(
    z.object({
      leadId: z.string(),
      result: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let body: Record<string, unknown> = { ...(ctx.input.additionalParameters ?? {}) };
    body.CreateAccount = ctx.input.createAccount ?? false;
    body.CreateContact = ctx.input.createContact ?? false;
    body.CreateOpportunity = ctx.input.createOpportunity ?? false;
    body.Status = ctx.input.statusCode;
    setIfDefined(body, 'SuppressDuplicateDetection', ctx.input.suppressDuplicateDetection);

    let result = await createDynamicsClient(ctx).invokeOperation({
      operationType: 'action',
      bindingType: 'entity',
      entitySetName: 'leads',
      recordKey: ctx.input.leadId,
      operationName: 'QualifyLead',
      requestBody: body
    });

    return {
      output: {
        leadId: ctx.input.leadId,
        result: result ?? {}
      },
      message: `Qualified lead **${ctx.input.leadId}**.`
    };
  })
  .build();

export let closeOpportunity = SlateTool.create(spec, {
  key: 'close_opportunity',
  name: 'Close Opportunity',
  description:
    'Close a Dynamics 365 Sales opportunity as won or lost by invoking the supported Dataverse opportunity close actions.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      closeAction: z
        .enum(['win', 'lose'])
        .describe('Whether to close the opportunity as won or lost'),
      opportunityId: z.string().describe('Opportunity GUID to close'),
      statusCode: z
        .number()
        .int()
        .describe('Opportunity close status reason code required by Dataverse'),
      subject: z.string().optional().describe('Opportunity close activity subject'),
      description: z.string().optional().describe('Opportunity close activity description'),
      actualEnd: z.string().optional().describe('Opportunity close actual end timestamp'),
      actualRevenue: z
        .number()
        .optional()
        .describe('Actual revenue for won opportunities when applicable'),
      closeRecordData: recordSchema
        .optional()
        .describe('Additional OpportunityClose activity fields.')
    })
  )
  .output(
    z.object({
      opportunityId: z.string(),
      closeAction: z.enum(['win', 'lose']),
      result: z.any()
    })
  )
  .handleInvocation(async ctx => {
    let opportunityId = requireText(ctx.input.opportunityId, 'opportunityId');
    let opportunityClose: Record<string, unknown> = {
      ...(ctx.input.closeRecordData ?? {}),
      '@odata.type': 'Microsoft.Dynamics.CRM.opportunityclose',
      'opportunityid@odata.bind': `/opportunities(${opportunityId})`
    };
    setIfDefined(opportunityClose, 'subject', ctx.input.subject);
    setIfDefined(opportunityClose, 'description', ctx.input.description);
    setIfDefined(opportunityClose, 'actualend', ctx.input.actualEnd);
    setIfDefined(opportunityClose, 'actualrevenue', ctx.input.actualRevenue);

    let result = await createDynamicsClient(ctx).invokeOperation({
      operationType: 'action',
      operationName: ctx.input.closeAction === 'win' ? 'WinOpportunity' : 'LoseOpportunity',
      requestBody: {
        OpportunityClose: opportunityClose,
        Status: ctx.input.statusCode
      }
    });

    return {
      output: {
        opportunityId,
        closeAction: ctx.input.closeAction,
        result: result ?? {}
      },
      message: `Closed opportunity **${opportunityId}** as **${ctx.input.closeAction}**.`
    };
  })
  .build();
