import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  buildListParams,
  compactOutput,
  createClient,
  numberValue,
  pageSummary,
  paginationInputSchema,
  paginationOutputSchema,
  rawRecordSchema,
  stringValue
} from './shared';

let projectSchema = z.object({
  id: z.number().optional().describe('Project id.'),
  code: z.string().optional().describe('Project code.'),
  name: z.string().optional().describe('Project name.'),
  customerId: z.number().optional().describe('Customer id.'),
  customerNo: z.number().optional().describe('Customer number.'),
  departmentCode: z.string().optional().describe('Department code.'),
  departmentId: z.number().optional().describe('Department id.'),
  locationCode: z.string().optional().describe('Location code.'),
  locationId: z.number().optional().describe('Location id.'),
  parentProjectCode: z.string().optional().describe('Parent project code.'),
  parentProjectId: z.number().optional().describe('Parent project id.'),
  projectBillingMethod: z.string().optional().describe('Project billing method.'),
  projectStatus: z.string().optional().describe('Project status.'),
  isActive: z.boolean().optional().describe('Whether project is active.'),
  isBillable: z.boolean().optional().describe('Whether project is billable.'),
  startDate: z.string().optional().describe('Start date.'),
  endDate: z.string().optional().describe('End date.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let departmentSchema = z.object({
  id: z.number().optional().describe('Department id.'),
  code: z.string().optional().describe('Department code.'),
  name: z.string().optional().describe('Department name.'),
  managerEmployeeId: z.number().optional().describe('Manager employee id.'),
  managerEmployeeNo: z.number().optional().describe('Manager employee number.'),
  isActive: z.boolean().optional().describe('Whether department is active.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let locationSchema = z.object({
  id: z.number().optional().describe('Location id.'),
  code: z.string().optional().describe('Location code.'),
  name: z.string().optional().describe('Location name.'),
  isActive: z.boolean().optional().describe('Whether location is active.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let customDimensionSchema = z.object({
  id: z.number().optional().describe('Custom dimension id.'),
  ordinal: z.number().optional().describe('Custom dimension ordinal, usually 1-3.'),
  code: z.string().optional().describe('Custom dimension code.'),
  name: z.string().optional().describe('Custom dimension name.'),
  externalImportReference: z.string().optional().describe('External import reference.'),
  isActive: z.boolean().optional().describe('Whether custom dimension is active.'),
  createdDateTimeOffset: z.string().optional().describe('Created timestamp.'),
  lastChangedDateTimeOffset: z.string().optional().describe('Last changed timestamp.'),
  record: rawRecordSchema
});

let mapProject = (project: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(project, 'Id'),
    code: stringValue(project, 'Code'),
    name: stringValue(project, 'Name'),
    customerId: numberValue(project, 'CustomerId'),
    customerNo: numberValue(project, 'CustomerNo'),
    departmentCode: stringValue(project, 'DepartmentCode'),
    departmentId: numberValue(project, 'DepartmentId'),
    locationCode: stringValue(project, 'LocationCode'),
    locationId: numberValue(project, 'LocationId'),
    parentProjectCode: stringValue(project, 'ParentProjectCode'),
    parentProjectId: numberValue(project, 'ParentProjectId'),
    projectBillingMethod: stringValue(project, 'ProjectBillingMethod'),
    projectStatus: stringValue(project, 'ProjectStatus'),
    isActive:
      typeof project.IsActive === 'boolean' ? (project.IsActive as boolean) : undefined,
    isBillable:
      typeof project.IsBillable === 'boolean' ? (project.IsBillable as boolean) : undefined,
    startDate: stringValue(project, 'StartDate'),
    endDate: stringValue(project, 'EndDate'),
    createdDateTimeOffset: stringValue(project, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(project, 'LastChangedDateTimeOffset')
  }),
  record: project
});

let mapDepartment = (department: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(department, 'Id'),
    code: stringValue(department, 'Code'),
    name: stringValue(department, 'Name'),
    managerEmployeeId: numberValue(department, 'ManagerEmployeeId'),
    managerEmployeeNo: numberValue(department, 'ManagerEmployeeNo'),
    isActive:
      typeof department.IsActive === 'boolean' ? (department.IsActive as boolean) : undefined,
    createdDateTimeOffset: stringValue(department, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(department, 'LastChangedDateTimeOffset')
  }),
  record: department
});

let mapLocation = (location: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(location, 'Id'),
    code: stringValue(location, 'Code'),
    name: stringValue(location, 'Name'),
    isActive:
      typeof location.IsActive === 'boolean' ? (location.IsActive as boolean) : undefined,
    createdDateTimeOffset: stringValue(location, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(location, 'LastChangedDateTimeOffset')
  }),
  record: location
});

let mapCustomDimension = (dimension: Record<string, unknown>) => ({
  ...compactOutput({
    id: numberValue(dimension, 'Id'),
    ordinal: numberValue(dimension, 'Ordinal'),
    code: stringValue(dimension, 'Code'),
    name: stringValue(dimension, 'Name'),
    externalImportReference: stringValue(dimension, 'ExternalImportReference'),
    isActive:
      typeof dimension.IsActive === 'boolean' ? (dimension.IsActive as boolean) : undefined,
    createdDateTimeOffset: stringValue(dimension, 'CreatedDateTimeOffset'),
    lastChangedDateTimeOffset: stringValue(dimension, 'LastChangedDateTimeOffset')
  }),
  record: dimension
});

export let powerofficeListProjects = SlateTool.create(spec, {
  name: 'List PowerOffice Projects',
  key: 'poweroffice_list_projects',
  description:
    'List PowerOffice projects and subprojects for sales order, invoice, ledger, and trial balance filtering.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectCodes: z.string().optional().describe('Project code filter.'),
      name: z.string().optional().describe('Project name contains filter.'),
      customerNos: z.string().optional().describe('Customer numbers filter.'),
      departmentCodes: z.string().optional().describe('Department codes filter.'),
      includeSubProjects: z.boolean().optional().describe('Include subprojects.'),
      excludeArchivedProject: z.boolean().optional().describe('Exclude archived projects.'),
      projectBillingMethod: z.string().optional().describe('Project billing method filter.'),
      projectManagerEmployeeNos: z
        .string()
        .optional()
        .describe('Project manager employee numbers or ranges.'),
      status: z.string().optional().describe('Project status filter.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return projects created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return projects changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('Projects.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let projects = await client.listProjects(
      buildListParams(ctx.input, {
        projectCodes: ctx.input.projectCodes,
        name: ctx.input.name,
        customerNos: ctx.input.customerNos,
        departmentCodes: ctx.input.departmentCodes,
        includeSubProjects: ctx.input.includeSubProjects,
        excludeArchivedProject: ctx.input.excludeArchivedProject,
        projectBillingMethod: ctx.input.projectBillingMethod,
        projectManagerEmployeeNos: ctx.input.projectManagerEmployeeNos,
        status: ctx.input.status,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        projects: projects.map(mapProject),
        page: pageSummary(ctx.input, projects.length)
      },
      message: `Retrieved **${projects.length}** PowerOffice project(s).`
    };
  })
  .build();

export let powerofficeListDepartments = SlateTool.create(spec, {
  name: 'List PowerOffice Departments',
  key: 'poweroffice_list_departments',
  description:
    'List PowerOffice departments for dimensional accounting, reporting filters, and sales/project setup.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      codes: z.string().optional().describe('Department codes filter.'),
      name: z.string().optional().describe('Department name contains filter.'),
      isActive: z.boolean().optional().describe('Filter by active state.'),
      managerEmployeeNo: z.number().int().optional().describe('Manager employee number.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return departments created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return departments changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      departments: z.array(departmentSchema).describe('Departments.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let departments = await client.listDepartments(
      buildListParams(ctx.input, {
        codes: ctx.input.codes,
        name: ctx.input.name,
        isActive: ctx.input.isActive,
        managerEmployeeNo: ctx.input.managerEmployeeNo,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        departments: departments.map(mapDepartment),
        page: pageSummary(ctx.input, departments.length)
      },
      message: `Retrieved **${departments.length}** PowerOffice department(s).`
    };
  })
  .build();

export let powerofficeListLocations = SlateTool.create(spec, {
  name: 'List PowerOffice Locations',
  key: 'poweroffice_list_locations',
  description:
    'List PowerOffice locations for dimensional accounting and sales order filtering.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      codes: z.string().optional().describe('Location codes filter.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return locations created after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      locations: z.array(locationSchema).describe('Locations.'),
      page: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let locations = await client.listLocations(
      buildListParams(ctx.input, {
        codes: ctx.input.codes,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        locations: locations.map(mapLocation),
        page: pageSummary(ctx.input, locations.length)
      },
      message: `Retrieved **${locations.length}** PowerOffice location(s).`
    };
  })
  .build();

export let powerofficeListCustomDimensions = SlateTool.create(spec, {
  name: 'List PowerOffice Custom Dimensions',
  key: 'poweroffice_list_custom_dimensions',
  description:
    'List PowerOffice custom dimension settings or values for dim1/dim2/dim3 accounting filters.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['settings', 'values'])
        .describe('List custom dimension settings or custom dimension values.'),
      codes: z.string().optional().describe('Custom dimension codes filter for values.'),
      ordinal: z.string().optional().describe('Custom dimension ordinal filter for values.'),
      externalImportReference: z
        .string()
        .optional()
        .describe('External import reference filter for values.'),
      createdDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return custom dimensions created after this timestamp.'),
      lastChangedDateTimeOffsetGreaterThan: z
        .string()
        .optional()
        .describe('Return custom dimensions changed after this timestamp.'),
      ...paginationInputSchema
    })
  )
  .output(
    z.object({
      resource: z.enum(['settings', 'values']),
      settings: z.array(rawRecordSchema).optional().describe('Custom dimension settings.'),
      dimensions: z
        .array(customDimensionSchema)
        .optional()
        .describe('Custom dimension values.'),
      page: paginationOutputSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.resource === 'settings') {
      let settings = await client.listCustomDimensionSettings();
      return {
        output: {
          resource: ctx.input.resource,
          settings,
          page: pageSummary(ctx.input, settings.length)
        },
        message: `Retrieved **${settings.length}** PowerOffice custom dimension setting(s).`
      };
    }

    let dimensions = await client.listCustomDimensions(
      buildListParams(ctx.input, {
        codes: ctx.input.codes,
        ordinal: ctx.input.ordinal,
        externalImportReference: ctx.input.externalImportReference,
        createdDateTimeOffsetGreaterThan: ctx.input.createdDateTimeOffsetGreaterThan,
        lastChangedDateTimeOffsetGreaterThan: ctx.input.lastChangedDateTimeOffsetGreaterThan
      })
    );

    return {
      output: {
        resource: ctx.input.resource,
        dimensions: dimensions.map(mapCustomDimension),
        page: pageSummary(ctx.input, dimensions.length)
      },
      message: `Retrieved **${dimensions.length}** PowerOffice custom dimension value(s).`
    };
  })
  .build();
