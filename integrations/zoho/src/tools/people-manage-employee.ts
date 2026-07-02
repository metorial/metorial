import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoPeopleClient } from '../lib/client';
import { zohoServiceError } from '../lib/errors';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let peopleManageEmployee = SlateTool.create(spec, {
  name: 'People Manage Employee',
  key: 'people_manage_employee',
  description: `List, search, create, or update employee records in Zoho People. Works with any form in Zoho People (employee, department, etc.). Also supports fetching attendance and leave information.`,
  instructions: [
    'Use formLinkName "P_Employee" or "employee" for the employee form.',
    'For search, provide searchColumn and searchValue (e.g., searchColumn="EMPLOYEEMAILALIAS", searchValue="john@example.com").',
    'For attendance, provide startDate and endDate in "dd-MMM-yyyy" format (e.g., "01-Jan-2024").'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['forms', 'list', 'get', 'create', 'update', 'attendance', 'leave_types'])
        .describe('Operation to perform'),
      formLinkName: z
        .string()
        .optional()
        .describe(
          'Form link name (e.g., "P_Employee", "employee"). Required for list/get/create/update.'
        ),
      recordId: z.string().optional().describe('Record ID (required for get, update)'),
      recordData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Record field data as key-value pairs (for create/update)'),
      searchColumn: z
        .string()
        .optional()
        .describe('Column to search by (e.g., "EMPLOYEEMAILALIAS")'),
      searchValue: z.string().optional().describe('Value to search for'),
      startIndex: z.number().optional().describe('Start index for pagination (default 1)'),
      limit: z.number().optional().describe('Number of records to return (max 200)'),
      startDate: z
        .string()
        .optional()
        .describe('Start date for attendance query (dd-MMM-yyyy)'),
      endDate: z.string().optional().describe('End date for attendance query (dd-MMM-yyyy)'),
      employeeId: z.string().optional().describe('Employee ID for attendance query')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Employee/form records'),
      forms: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Available Zoho People forms'),
      record: z
        .record(z.string(), z.any())
        .optional()
        .describe('Single record (for get/create/update)'),
      leaveTypes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Leave type details'),
      attendance: z.any().optional().describe('Attendance entries'),
      apiResponse: z.any().optional().describe('Raw API response for complex results')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoPeopleClient({ token: ctx.auth.token, datacenter: dc });

    if (ctx.input.action === 'forms') {
      let result = await client.listForms();
      let forms = result?.response?.result || result?.forms || result || [];
      return {
        output: { forms: Array.isArray(forms) ? forms : [], apiResponse: result },
        message: `Retrieved **${Array.isArray(forms) ? forms.length : 0}** Zoho People forms.`
      };
    }

    if (ctx.input.action === 'list') {
      if (!ctx.input.formLinkName) throw zohoServiceError('formLinkName is required for list');
      let result = await client.getFormRecords(ctx.input.formLinkName, {
        sIndex: ctx.input.startIndex,
        limit: ctx.input.limit,
        searchColumn: ctx.input.searchColumn,
        searchValue: ctx.input.searchValue
      });
      let records = Array.isArray(result) ? result : result?.data || [];
      return {
        output: { records, apiResponse: result },
        message: `Retrieved **${records.length}** records from **${ctx.input.formLinkName}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.formLinkName) throw zohoServiceError('formLinkName is required for get');
      if (!ctx.input.recordId) throw zohoServiceError('recordId is required for get');
      let result = await client.getFormRecordById(ctx.input.formLinkName, ctx.input.recordId);
      return {
        output: { record: result },
        message: `Fetched record **${ctx.input.recordId}** from **${ctx.input.formLinkName}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.formLinkName)
        throw zohoServiceError('formLinkName is required for create');
      if (!ctx.input.recordData) throw zohoServiceError('recordData is required for create');
      let result = await client.insertFormRecord(ctx.input.formLinkName, ctx.input.recordData);
      return {
        output: { record: result, apiResponse: result },
        message: `Created record in **${ctx.input.formLinkName}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.formLinkName)
        throw zohoServiceError('formLinkName is required for update');
      if (!ctx.input.recordId) throw zohoServiceError('recordId is required for update');
      if (!ctx.input.recordData) throw zohoServiceError('recordData is required for update');
      let result = await client.updateFormRecord(
        ctx.input.formLinkName,
        ctx.input.recordId,
        ctx.input.recordData
      );
      return {
        output: { record: result, apiResponse: result },
        message: `Updated record **${ctx.input.recordId}** in **${ctx.input.formLinkName}**.`
      };
    }

    if (ctx.input.action === 'leave_types') {
      let result = await client.getLeaveTypes();
      return {
        output: { leaveTypes: result?.response?.result || result },
        message: `Retrieved leave types.`
      };
    }

    if (ctx.input.action === 'attendance') {
      if (!ctx.input.startDate || !ctx.input.endDate)
        throw zohoServiceError('startDate and endDate are required for attendance');
      let result = await client.getAttendanceEntries({
        sdate: ctx.input.startDate,
        edate: ctx.input.endDate,
        empId: ctx.input.employeeId
      });
      return {
        output: { attendance: result },
        message: `Retrieved attendance entries from **${ctx.input.startDate}** to **${ctx.input.endDate}**.`
      };
    }

    throw zohoServiceError('Invalid People action.');
  })
  .build();
