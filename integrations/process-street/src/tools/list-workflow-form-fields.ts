import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let formFieldSchema = z.object({
  formFieldId: z.string().describe('ID of the form field'),
  taskId: z.string().optional().describe('ID of the parent task'),
  fieldType: z
    .string()
    .describe('Type of the field (Text, Number, Date, Email, Url, Select, MultiSelect, etc.)'),
  key: z.string().optional().describe('Variable reference key'),
  label: z.string().optional().describe('Display label'),
  dataSetLinked: z.boolean().optional().describe('Whether the field is linked to a data set')
});

export let listWorkflowFormFields = SlateTool.create(spec, {
  name: 'List Workflow Form Fields',
  key: 'list_workflow_form_fields',
  description: `List all form field definitions for a workflow (template). Returns field IDs, types, labels, and keys. Use this to understand what form fields exist before reading or updating values in workflow runs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to list form fields for')
    })
  )
  .output(
    z.object({
      formFields: z.array(formFieldSchema).describe('List of form field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listWorkflowFormFields(ctx.input.workflowId);
    let formFields = (data.formFields || []).map((f: any) => ({
      formFieldId: f.id,
      taskId: f.taskId,
      fieldType: f.fieldType,
      key: f.key,
      label: f.label,
      dataSetLinked: f.dataSetLinked
    }));
    return {
      output: { formFields },
      message: `Found **${formFields.length}** form field(s).`
    };
  })
  .build();
