import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorSchema, getNextCursor, nextCursorSchema } from '../lib/pagination';
import { spec } from '../spec';

export let listFormFieldOptions = SlateTool.create(spec, {
  name: 'List Form Field Options',
  key: 'list_form_field_options',
  description:
    'List available values and labels for a workflow form field. Use list_workflow_form_fields to find the field ID, then use these values when updating selection fields. Data-set-linked options also include their row IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      workflowId: z.string().describe('Workflow ID from list_workflows'),
      formFieldId: z.string().describe('Form field ID from list_workflow_form_fields'),
      cursor: cursorSchema
    })
  )
  .output(
    z.object({
      options: z.array(
        z.object({
          value: z.string().describe('Stored value to use when selecting this option'),
          label: z.string().describe('Display label of the option'),
          dataSetRowId: z.string().optional().describe('Linked data set row ID when present')
        })
      ),
      nextCursor: nextCursorSchema
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).listFormFieldOptions(
      ctx.input.workflowId,
      ctx.input.formFieldId,
      ctx.input.cursor
    );
    let options = (data.options || []).map((option: any) => ({
      value: option.value,
      label: option.label,
      dataSetRowId: option.dataSetRowId
    }));
    return {
      output: { options, nextCursor: getNextCursor(data) },
      message: `Found **${options.length}** option(s) on this page.`
    };
  })
  .build();
