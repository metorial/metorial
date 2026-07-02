import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let formFieldValueSchema = z.object({
  formFieldId: z.string().describe('ID of the form field'),
  workflowRunId: z.string().optional().describe('ID of the workflow run'),
  taskId: z.string().optional().describe('ID of the parent task'),
  key: z.string().optional().describe('Variable reference key for the form field'),
  label: z.string().optional().describe('Display label of the form field'),
  fieldType: z
    .string()
    .optional()
    .describe(
      'Type of form field (Text, Number, Date, Email, Url, Select, MultiSelect, etc.)'
    ),
  value: z.any().optional().describe('Current value of the form field')
});

export let manageFormFields = SlateTool.create(spec, {
  name: 'Manage Form Fields',
  key: 'manage_form_fields',
  description: `Read or update form field values in a workflow run. Can list all form field values for an entire workflow run or a specific task, and update multiple form field values at once.`,
  instructions: [
    'To update form fields, provide the formFieldId and either a single value or an array of values (for multi-select fields).',
    'For date fields, use ISO 8601 format and optionally set timeHidden to hide the time component.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run'),
      action: z.enum(['list', 'update']).describe('Action to perform'),
      taskId: z
        .string()
        .optional()
        .describe('ID of a specific task to list form fields for (only for list action)'),
      fields: z
        .array(
          z.object({
            formFieldId: z.string().describe('ID of the form field to update'),
            value: z.string().optional().describe('New value for the field'),
            values: z
              .array(z.string())
              .optional()
              .describe('New values for multi-select fields'),
            timeHidden: z.boolean().optional().describe('Hide time component for date fields'),
            dataSetRowId: z.string().optional().describe('Link to a data set row')
          })
        )
        .optional()
        .describe('Fields to update (required for update action)')
    })
  )
  .output(
    z.object({
      formFields: z
        .array(formFieldValueSchema)
        .optional()
        .describe('List of form field values'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { workflowRunId, action, taskId, fields } = ctx.input;

    if (action === 'list') {
      let data: any;
      if (taskId) {
        data = await client.listTaskFormFieldValues(workflowRunId, taskId);
      } else {
        data = await client.listFormFieldValues(workflowRunId);
      }
      let formFields = (data.formFieldValues || []).map((f: any) => ({
        formFieldId: f.id,
        workflowRunId: f.workflowRunId,
        taskId: f.taskId,
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        value: f.data
      }));
      return {
        output: { formFields, success: true },
        message: `Found **${formFields.length}** form field(s).`
      };
    }

    if (!fields || fields.length === 0) {
      throw new Error('Fields array is required for update action');
    }

    let updatePayload = fields.map(f => ({
      id: f.formFieldId,
      value: f.value,
      values: f.values,
      timeHidden: f.timeHidden,
      dataSetRowId: f.dataSetRowId
    }));

    let result = await client.updateFormFieldValues(workflowRunId, updatePayload);
    let updatedFields = (result.fields || []).map((f: any) => ({
      formFieldId: f.id,
      workflowRunId: f.workflowRunId,
      taskId: f.taskId,
      key: f.key,
      label: f.label,
      fieldType: f.fieldType,
      value: f.data
    }));

    return {
      output: { formFields: updatedFields, success: true },
      message: `Updated **${fields.length}** form field(s).`
    };
  })
  .build();
