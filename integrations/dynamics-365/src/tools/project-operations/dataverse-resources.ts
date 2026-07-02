import {
  type DataversePrimitiveKeyValue,
  type DataverseRecord,
  dataverseRecordKeyFromInput,
  normalizeDataverseGuid
} from '@slates/microsoft-dataverse-recipes';
import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import { projectOperationsValidationError } from './errors';
import { createProjectOperationsDataverseClient } from './shared';

let recordSchema = z.record(z.string(), z.unknown());
let alternateKeyValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
let alternateKeySchema = z.record(z.string(), alternateKeyValueSchema);
let resourceActionSchema = z
  .enum(['list', 'get', 'create_draft', 'update_draft'])
  .describe(
    'Operation variant. get/update_draft require recordId or alternateKey. create_draft/update_draft are rejected for read-only resources.'
  );
let readOnlyResourceActionSchema = z
  .enum(['list', 'get'])
  .describe('Operation variant. get requires recordId or alternateKey.');

let queryFields = {
  dataverseInstanceUrl: z
    .string()
    .optional()
    .describe('Override Dataverse environment URL for this call.'),
  entitySetName: z
    .string()
    .optional()
    .describe(
      'Override the default Dataverse entity set name for this Project Operations resource.'
    ),
  recordId: z.string().optional().describe('Dataverse record GUID for get/update_draft.'),
  alternateKey: alternateKeySchema
    .optional()
    .describe('Dataverse alternate key for get/update_draft.'),
  select: z.array(z.string()).optional().describe('Dataverse columns to return.'),
  filter: z
    .string()
    .optional()
    .describe('Additional Dataverse OData $filter expression for list.'),
  orderBy: z.string().optional().describe('Dataverse OData $orderby expression for list.'),
  expand: z.string().optional().describe('Dataverse OData $expand expression.'),
  top: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum records to return from one list page.'),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(5000)
    .optional()
    .describe(
      'Preferred Dataverse page size. Defaults to config.projectOperationsDefaultPageSize when set.'
    ),
  nextLink: z
    .string()
    .optional()
    .describe('Dataverse @odata.nextLink from a previous list response.'),
  includeCount: z.boolean().optional().describe('Request @odata.count for list actions.'),
  returnRepresentation: z
    .boolean()
    .optional()
    .describe('When false, Dataverse may omit the mutated record representation.'),
  additionalFields: recordSchema
    .optional()
    .describe(
      'Additional Dataverse column values, including custom columns and @odata.bind values.'
    )
};

let projectLookupFields = {
  projectId: z
    .string()
    .optional()
    .describe('Project GUID used for lookup binding or list filtering.'),
  projectLookupValueField: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup value field for list filtering. Defaults to _msdyn_project_value.'
    ),
  projectBindColumn: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup navigation property for project binding. Defaults to msdyn_project.'
    ),
  projectsEntitySetName: z
    .string()
    .optional()
    .describe('Entity set used for project @odata.bind values. Defaults to msdyn_projects.')
};

let taskLookupFields = {
  taskId: z
    .string()
    .optional()
    .describe('Project task GUID used for lookup binding or filtering.'),
  taskLookupValueField: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup value field for task list filtering. Defaults to _msdyn_projecttask_value.'
    ),
  taskBindColumn: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup navigation property for task binding. Defaults to msdyn_projecttask.'
    ),
  tasksEntitySetName: z
    .string()
    .optional()
    .describe(
      'Entity set used for project task @odata.bind values. Defaults to msdyn_projecttasks.'
    )
};

let resourceLookupFields = {
  resourceId: z
    .string()
    .optional()
    .describe('Bookable resource GUID used for lookup binding or filtering.'),
  resourceLookupValueField: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup value field for resource filtering. Defaults to _msdyn_bookableresource_value.'
    ),
  resourceBindColumn: z
    .string()
    .optional()
    .describe(
      'Dataverse lookup navigation property for resource binding. Defaults to msdyn_bookableresource.'
    ),
  resourcesEntitySetName: z
    .string()
    .optional()
    .describe(
      'Entity set used for bookable resource @odata.bind values. Defaults to bookableresources.'
    )
};

let projectInputSchema = z.object({
  action: resourceActionSchema,
  ...queryFields,
  projectName: z.string().optional().describe('Project name / subject for create or update.'),
  description: z.string().optional().describe('Project description.'),
  scheduledStart: z.string().optional().describe('Scheduled project start date/time.'),
  scheduledEnd: z.string().optional().describe('Scheduled project end date/time.'),
  customerAccountId: z.string().optional().describe('Customer account GUID to bind.'),
  customerAccountBindColumn: z
    .string()
    .optional()
    .describe('Customer lookup navigation property. Defaults to msdyn_customer.'),
  projectManagerUserId: z
    .string()
    .optional()
    .describe('Project manager system user GUID to bind.'),
  projectManagerBindColumn: z
    .string()
    .optional()
    .describe('Project manager lookup navigation property. Defaults to msdyn_projectmanager.'),
  currencyId: z.string().optional().describe('Transaction currency GUID to bind.'),
  currencyBindColumn: z
    .string()
    .optional()
    .describe('Currency lookup navigation property. Defaults to transactioncurrencyid.')
});

let taskReadInputSchema = z.object({
  action: readOnlyResourceActionSchema,
  ...queryFields,
  ...projectLookupFields
});

let assignmentReadInputSchema = z.object({
  action: readOnlyResourceActionSchema,
  ...queryFields,
  ...projectLookupFields,
  ...taskLookupFields,
  ...resourceLookupFields
});

let timeEntryInputSchema = z.object({
  action: resourceActionSchema,
  ...queryFields,
  ...projectLookupFields,
  ...taskLookupFields,
  ...resourceLookupFields,
  entryDate: z.string().optional().describe('Time entry date.'),
  durationMinutes: z.number().optional().describe('Time entry duration in minutes.'),
  description: z.string().optional().describe('Time entry description.'),
  externalDescription: z.string().optional().describe('Customer-facing time entry notes.')
});

let expenseInputSchema = z.object({
  action: resourceActionSchema,
  ...queryFields,
  ...projectLookupFields,
  ...taskLookupFields,
  expenseName: z.string().optional().describe('Expense name or short description.'),
  description: z.string().optional().describe('Expense description.'),
  transactionDate: z.string().optional().describe('Expense transaction date.'),
  amount: z.number().optional().describe('Expense amount.'),
  categoryId: z.string().optional().describe('Expense category GUID to bind.'),
  categoryBindColumn: z
    .string()
    .optional()
    .describe(
      'Expense category lookup navigation property. Defaults to msdyn_expensecategory.'
    ),
  categoriesEntitySetName: z
    .string()
    .optional()
    .describe(
      'Entity set used for expense category @odata.bind values. Defaults to msdyn_expensecategories.'
    )
});

let readOnlyProjectDataInputSchema = z.object({
  action: readOnlyResourceActionSchema,
  ...queryFields,
  ...projectLookupFields,
  accountId: z
    .string()
    .optional()
    .describe('Account GUID used for list filtering when applicable.'),
  accountLookupValueField: z
    .string()
    .optional()
    .describe(
      'Dataverse account lookup value field for filtering. Defaults to _customerid_value.'
    )
});

let resourceOutputSchema = z.object({
  action: resourceActionSchema,
  entitySetName: z.string(),
  record: recordSchema.optional(),
  records: z.array(recordSchema).optional(),
  nextLink: z.string().nullable().optional(),
  count: z.number().optional(),
  recordId: z.string().optional()
});

type ResourceDefinition = {
  key: string;
  name: string;
  description: string;
  defaultEntitySetName: string;
  idField: string;
  displayName: string;
  inputSchema: any;
  writable: boolean;
  defaultSelect?: string[];
  buildRecord?: (input: Record<string, unknown>) => DataverseRecord;
  buildListFilters?: (input: Record<string, unknown>) => string[];
};

let hasValue = (value: unknown) => value !== undefined && value !== null && value !== '';

let addBind = (
  data: DataverseRecord,
  columnName: unknown,
  defaultColumnName: string,
  entitySetName: unknown,
  defaultEntitySetName: string,
  recordId: unknown
) => {
  if (!hasValue(recordId)) return;
  if (typeof recordId !== 'string') {
    throw projectOperationsValidationError(`${defaultColumnName} record ID must be a string.`);
  }

  let column = typeof columnName === 'string' && columnName ? columnName : defaultColumnName;
  let entitySet =
    typeof entitySetName === 'string' && entitySetName ? entitySetName : defaultEntitySetName;
  let property = column.endsWith('@odata.bind') ? column : `${column}@odata.bind`;
  data[property] = `/${entitySet}(${normalizeDataverseGuid(recordId)})`;
};

let mergeAdditionalFields = (data: DataverseRecord, input: Record<string, unknown>) => ({
  ...data,
  ...((input.additionalFields as DataverseRecord | undefined) ?? {})
});

let requireMutationData = (data: DataverseRecord, resource: string) => {
  if (Object.keys(data).length === 0) {
    throw projectOperationsValidationError(
      `${resource} create_draft/update_draft requires at least one typed field or additionalFields value.`
    );
  }

  return data;
};

let lookupFilter = (
  input: Record<string, unknown>,
  idKey: string,
  fieldKey: string,
  defaultField: string
) => {
  let value = input[idKey];
  if (!hasValue(value)) return undefined;
  if (typeof value !== 'string') {
    throw projectOperationsValidationError(`${idKey} must be a Dataverse GUID string.`);
  }

  let field =
    typeof input[fieldKey] === 'string' && input[fieldKey] ? input[fieldKey] : defaultField;
  return `${field} eq ${normalizeDataverseGuid(value)}`;
};

let combineFilters = (filters: Array<string | undefined>) =>
  filters.filter((filter): filter is string => Boolean(filter)).join(' and ');

let compactFilters = (filters: Array<string | undefined>) =>
  filters.filter((filter): filter is string => Boolean(filter));

let recordIdFrom = (record: unknown, idField: string) => {
  if (!record || typeof record !== 'object') return undefined;
  let value = (record as DataverseRecord)[idField];
  return typeof value === 'string' ? value : undefined;
};

let buildProjectRecord = (input: Record<string, unknown>) => {
  let data = pickDefined({
    msdyn_subject: input.projectName,
    msdyn_description: input.description,
    msdyn_scheduledstart: input.scheduledStart,
    msdyn_scheduledend: input.scheduledEnd
  }) as DataverseRecord;

  addBind(
    data,
    input.customerAccountBindColumn,
    'msdyn_customer',
    'accounts',
    'accounts',
    input.customerAccountId
  );
  addBind(
    data,
    input.projectManagerBindColumn,
    'msdyn_projectmanager',
    'systemusers',
    'systemusers',
    input.projectManagerUserId
  );
  addBind(
    data,
    input.currencyBindColumn,
    'transactioncurrencyid',
    'transactioncurrencies',
    'transactioncurrencies',
    input.currencyId
  );

  return mergeAdditionalFields(data, input);
};

let addProjectTaskBindings = (data: DataverseRecord, input: Record<string, unknown>) => {
  addBind(
    data,
    input.projectBindColumn,
    'msdyn_project',
    input.projectsEntitySetName,
    'msdyn_projects',
    input.projectId
  );
  addBind(
    data,
    input.taskBindColumn,
    'msdyn_projecttask',
    input.tasksEntitySetName,
    'msdyn_projecttasks',
    input.taskId
  );
};

let addResourceBinding = (data: DataverseRecord, input: Record<string, unknown>) => {
  addBind(
    data,
    input.resourceBindColumn,
    'msdyn_bookableresource',
    input.resourcesEntitySetName,
    'bookableresources',
    input.resourceId
  );
};

let buildTimeEntryRecord = (input: Record<string, unknown>) => {
  let data = pickDefined({
    msdyn_date: input.entryDate,
    msdyn_duration: input.durationMinutes,
    msdyn_description: input.description,
    msdyn_externaldescription: input.externalDescription
  }) as DataverseRecord;

  addProjectTaskBindings(data, input);
  addResourceBinding(data, input);

  return mergeAdditionalFields(data, input);
};

let buildExpenseRecord = (input: Record<string, unknown>) => {
  let data = pickDefined({
    msdyn_name: input.expenseName,
    msdyn_description: input.description,
    msdyn_transactiondate: input.transactionDate,
    msdyn_amount: input.amount
  }) as DataverseRecord;

  addProjectTaskBindings(data, input);
  addBind(
    data,
    input.categoryBindColumn,
    'msdyn_expensecategory',
    input.categoriesEntitySetName,
    'msdyn_expensecategories',
    input.categoryId
  );

  return mergeAdditionalFields(data, input);
};

let projectRelatedFilters = (input: Record<string, unknown>) =>
  compactFilters([
    lookupFilter(input, 'projectId', 'projectLookupValueField', '_msdyn_project_value')
  ]);

let taskRelatedFilters = (input: Record<string, unknown>) => [
  ...projectRelatedFilters(input),
  ...compactFilters([
    lookupFilter(input, 'taskId', 'taskLookupValueField', '_msdyn_projecttask_value')
  ])
];

let assignmentFilters = (input: Record<string, unknown>) => [
  ...taskRelatedFilters(input),
  ...compactFilters([
    lookupFilter(
      input,
      'resourceId',
      'resourceLookupValueField',
      '_msdyn_bookableresource_value'
    )
  ])
];

let readOnlyProjectDataFilters = (input: Record<string, unknown>) => [
  ...projectRelatedFilters(input),
  ...compactFilters([
    lookupFilter(input, 'accountId', 'accountLookupValueField', '_customerid_value')
  ])
];

let createResourceTool = (definition: ResourceDefinition) =>
  SlateTool.create(spec, {
    name: definition.name,
    key: definition.key,
    description: definition.description,
    constraints: definition.writable
      ? [
          'Write actions are draft-oriented only and do not submit, approve, post, invoice, or delete Project Operations data.',
          'Project Operations table names and lookup navigation properties can vary by tenant; use entitySetName and additionalFields overrides when needed.'
        ]
      : [
          'This resource is read-only in this package. create_draft and update_draft are rejected at runtime.'
        ],
    tags: {
      readOnly: !definition.writable,
      destructive: false
    }
  })
    .input(definition.inputSchema)
    .output(resourceOutputSchema)
    .handleInvocation(async ctx => {
      let input = ctx.input as Record<string, unknown>;
      let action = input.action as z.infer<typeof resourceActionSchema>;
      let entitySetName =
        typeof input.entitySetName === 'string' && input.entitySetName
          ? input.entitySetName
          : definition.defaultEntitySetName;
      let client = createProjectOperationsDataverseClient(ctx, {
        dataverseInstanceUrl:
          typeof input.dataverseInstanceUrl === 'string'
            ? input.dataverseInstanceUrl
            : undefined
      });

      if (action === 'list') {
        let filter = combineFilters([
          typeof input.filter === 'string' ? input.filter : undefined,
          ...(definition.buildListFilters?.(input) ?? [])
        ]);
        let top = typeof input.top === 'number' ? input.top : undefined;
        let result = await client.listRecords(entitySetName, {
          select: (input.select as string[] | undefined) ?? definition.defaultSelect,
          filter: filter || undefined,
          orderBy: typeof input.orderBy === 'string' ? input.orderBy : undefined,
          expand: typeof input.expand === 'string' ? input.expand : undefined,
          top,
          pageSize:
            top === undefined
              ? typeof input.pageSize === 'number'
                ? input.pageSize
                : ctx.config.projectOperationsDefaultPageSize
              : undefined,
          nextLink: typeof input.nextLink === 'string' ? input.nextLink : undefined,
          includeCount:
            typeof input.includeCount === 'boolean' ? input.includeCount : undefined
        });

        return {
          output: {
            action,
            entitySetName,
            records: result.records,
            nextLink: result.nextLink,
            count: result.count
          },
          message: `Retrieved **${result.records.length}** ${definition.displayName} record(s).${result.nextLink ? ' More records are available.' : ''}`
        };
      }

      if (action === 'get') {
        let record = await client.getRecord(
          entitySetName,
          dataverseRecordKeyFromInput({
            recordId: typeof input.recordId === 'string' ? input.recordId : undefined,
            alternateKey: input.alternateKey as
              | Record<string, DataversePrimitiveKeyValue>
              | undefined
          }),
          {
            select: (input.select as string[] | undefined) ?? definition.defaultSelect,
            expand: typeof input.expand === 'string' ? input.expand : undefined
          }
        );

        return {
          output: {
            action,
            entitySetName,
            record,
            recordId: recordIdFrom(record, definition.idField)
          },
          message: `Retrieved ${definition.displayName} record.`
        };
      }

      if (!definition.writable || !definition.buildRecord) {
        throw projectOperationsValidationError(
          `${definition.name} is read-only in this package.`
        );
      }

      let data = requireMutationData(definition.buildRecord(input), definition.name);

      if (action === 'create_draft') {
        let record = await client.createRecord(entitySetName, data, {
          returnRepresentation: input.returnRepresentation !== false
        });

        return {
          output: {
            action,
            entitySetName,
            record,
            recordId: recordIdFrom(record, definition.idField)
          },
          message: `Created draft ${definition.displayName} record.`
        };
      }

      let recordKey = dataverseRecordKeyFromInput({
        recordId: typeof input.recordId === 'string' ? input.recordId : undefined,
        alternateKey: input.alternateKey as
          | Record<string, DataversePrimitiveKeyValue>
          | undefined
      });
      let existingRecord = await client.getRecord(entitySetName, recordKey, {
        select: [definition.idField]
      });
      let updateKey = recordIdFrom(existingRecord, definition.idField);
      if (!updateKey) {
        throw projectOperationsValidationError(
          `Could not resolve ${definition.displayName} primary ID before update_draft.`
        );
      }

      let record = await client.updateRecord(entitySetName, updateKey, data, {
        preventCreate: true,
        returnRepresentation: input.returnRepresentation !== false
      });

      return {
        output: {
          action,
          entitySetName,
          record,
          recordId: recordIdFrom(record, definition.idField) ?? updateKey
        },
        message: `Updated draft ${definition.displayName} record.`
      };
    })
    .build();

export let manageProjects = createResourceTool({
  key: 'manage_projects',
  name: 'Manage Projects',
  description:
    'List, get, create, and update draft Dynamics 365 Project Operations project records in Dataverse.',
  defaultEntitySetName: 'msdyn_projects',
  idField: 'msdyn_projectid',
  displayName: 'project',
  inputSchema: projectInputSchema,
  writable: true,
  defaultSelect: [
    'msdyn_projectid',
    'msdyn_subject',
    'msdyn_scheduledstart',
    'msdyn_scheduledend'
  ],
  buildRecord: buildProjectRecord
});

export let manageProjectTasks = createResourceTool({
  key: 'manage_project_tasks',
  name: 'Manage Project Tasks',
  description:
    'List and get project task records for Dynamics 365 Project Operations work breakdown structures. Use Manage Project Schedule for task create, update, and delete through Microsoft Project schedule APIs.',
  defaultEntitySetName: 'msdyn_projecttasks',
  idField: 'msdyn_projecttaskid',
  displayName: 'project task',
  inputSchema: taskReadInputSchema,
  writable: false,
  defaultSelect: [
    'msdyn_projecttaskid',
    'msdyn_subject',
    'msdyn_start',
    'msdyn_finish',
    'msdyn_effort'
  ],
  buildListFilters: input => projectRelatedFilters(input)
});

export let manageResourceAssignments = createResourceTool({
  key: 'manage_resource_assignments',
  name: 'Manage Resource Assignments',
  description:
    'List and get Project Operations resource assignment records for planned project work. Use Manage Project Schedule for assignment create, contour update, and delete through Microsoft Project schedule APIs.',
  defaultEntitySetName: 'msdyn_resourceassignments',
  idField: 'msdyn_resourceassignmentid',
  displayName: 'resource assignment',
  inputSchema: assignmentReadInputSchema,
  writable: false,
  defaultSelect: [
    'msdyn_resourceassignmentid',
    'msdyn_name',
    'msdyn_effort',
    'msdyn_start',
    'msdyn_finish'
  ],
  buildListFilters: input => assignmentFilters(input)
});

export let manageTimeEntries = createResourceTool({
  key: 'manage_time_entries',
  name: 'Manage Time Entries',
  description:
    'List, get, create, and update draft Project Operations time entry records. Approval and posting workflows are not exposed.',
  defaultEntitySetName: 'msdyn_timeentries',
  idField: 'msdyn_timeentryid',
  displayName: 'time entry',
  inputSchema: timeEntryInputSchema,
  writable: true,
  defaultSelect: ['msdyn_timeentryid', 'msdyn_date', 'msdyn_duration', 'msdyn_description'],
  buildRecord: buildTimeEntryRecord,
  buildListFilters: input => assignmentFilters(input)
});

export let manageExpenses = createResourceTool({
  key: 'manage_expenses',
  name: 'Manage Expenses',
  description:
    'List, get, create, and update draft Project Operations expense records. Submission, approval, invoicing, and reimbursement posting are not exposed.',
  defaultEntitySetName: 'msdyn_expenses',
  idField: 'msdyn_expenseid',
  displayName: 'expense',
  inputSchema: expenseInputSchema,
  writable: true,
  defaultSelect: ['msdyn_expenseid', 'msdyn_name', 'msdyn_transactiondate', 'msdyn_amount'],
  buildRecord: buildExpenseRecord,
  buildListFilters: input => taskRelatedFilters(input)
});

export let manageProjectContracts = createResourceTool({
  key: 'manage_project_contracts',
  name: 'Manage Project Contracts',
  description:
    'List and get Project Operations project contract records from Dataverse. Contract creation and activation are deferred.',
  defaultEntitySetName: 'salesorders',
  idField: 'salesorderid',
  displayName: 'project contract',
  inputSchema: readOnlyProjectDataInputSchema,
  writable: false,
  defaultSelect: ['salesorderid', 'name', 'ordernumber', 'statecode', 'statuscode'],
  buildListFilters: input => readOnlyProjectDataFilters(input)
});

export let manageProjectActuals = createResourceTool({
  key: 'manage_project_actuals',
  name: 'Manage Project Actuals',
  description:
    'List and get Project Operations actual records from Dataverse for cost, billing, and revenue reconciliation.',
  defaultEntitySetName: 'msdyn_actuals',
  idField: 'msdyn_actualid',
  displayName: 'project actual',
  inputSchema: readOnlyProjectDataInputSchema,
  writable: false,
  defaultSelect: [
    'msdyn_actualid',
    'msdyn_description',
    'msdyn_transactiondate',
    'msdyn_amount'
  ],
  buildListFilters: input => readOnlyProjectDataFilters(input)
});

export let manageProjectInvoices = createResourceTool({
  key: 'manage_project_invoices',
  name: 'Manage Project Invoices',
  description:
    'List and get Project Operations invoice records from Dataverse. Invoice creation, confirmation, and posting are deferred.',
  defaultEntitySetName: 'invoices',
  idField: 'invoiceid',
  displayName: 'project invoice',
  inputSchema: readOnlyProjectDataInputSchema,
  writable: false,
  defaultSelect: [
    'invoiceid',
    'name',
    'invoicenumber',
    'statecode',
    'statuscode',
    'totalamount'
  ],
  buildListFilters: input => readOnlyProjectDataFilters(input)
});
