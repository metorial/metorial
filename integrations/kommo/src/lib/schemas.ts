import { z } from 'zod';

export let customFieldValueSchema = z.object({
  fieldId: z.number().describe('ID of the custom field'),
  values: z
    .array(
      z.object({
        value: z.union([z.string(), z.number(), z.boolean()]).describe('Field value'),
        enumId: z.number().optional().describe('Enum option ID for select/multiselect fields')
      })
    )
    .describe('Array of values for the field')
});

export let tagSchema = z.object({
  tagId: z.number().optional().describe('Tag ID'),
  name: z.string().optional().describe('Tag name')
});

export let paginationSchema = z.object({
  page: z.number().optional().describe('Page number (starts from 1)'),
  limit: z.number().optional().describe('Number of results per page (max 250)')
});

export let leadOutputSchema = z.object({
  leadId: z.number().describe('Lead ID'),
  name: z.string().optional().describe('Lead name'),
  price: z.number().optional().describe('Lead price/deal value'),
  responsibleUserId: z.number().optional().describe('Responsible user ID'),
  statusId: z.number().optional().describe('Pipeline stage/status ID'),
  pipelineId: z.number().optional().describe('Pipeline ID'),
  lossReasonId: z.number().nullable().optional().describe('Loss reason ID'),
  createdBy: z.number().optional().describe('ID of user who created the lead'),
  updatedBy: z.number().optional().describe('ID of user who last updated the lead'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix)'),
  updatedAt: z.number().optional().describe('Last update timestamp (Unix)'),
  closedAt: z.number().nullable().optional().describe('Close timestamp (Unix)'),
  customFieldsValues: z.any().optional().describe('Custom field values'),
  tags: z.any().optional().describe('Tags attached to the lead')
});

export let contactOutputSchema = z.object({
  contactId: z.number().describe('Contact ID'),
  name: z.string().optional().describe('Contact name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  responsibleUserId: z.number().optional().describe('Responsible user ID'),
  createdBy: z.number().optional().describe('ID of user who created the contact'),
  updatedBy: z.number().optional().describe('ID of user who last updated the contact'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix)'),
  updatedAt: z.number().optional().describe('Last update timestamp (Unix)'),
  customFieldsValues: z.any().optional().describe('Custom field values'),
  tags: z.any().optional().describe('Tags attached to the contact')
});

export let companyOutputSchema = z.object({
  companyId: z.number().describe('Company ID'),
  name: z.string().optional().describe('Company name'),
  responsibleUserId: z.number().optional().describe('Responsible user ID'),
  createdBy: z.number().optional().describe('ID of user who created the company'),
  updatedBy: z.number().optional().describe('ID of user who last updated the company'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix)'),
  updatedAt: z.number().optional().describe('Last update timestamp (Unix)'),
  customFieldsValues: z.any().optional().describe('Custom field values'),
  tags: z.any().optional().describe('Tags attached to the company')
});

export let taskOutputSchema = z.object({
  taskId: z.number().describe('Task ID'),
  text: z.string().optional().describe('Task description'),
  responsibleUserId: z.number().optional().describe('Responsible user ID'),
  entityId: z.number().optional().describe('Linked entity ID'),
  entityType: z
    .string()
    .optional()
    .describe('Linked entity type (leads, contacts, companies)'),
  taskTypeId: z.number().optional().describe('Task type ID (1=Follow-up, 2=Meeting)'),
  completeTill: z.number().optional().describe('Deadline timestamp (Unix)'),
  duration: z.number().optional().describe('Task duration in seconds'),
  isCompleted: z.boolean().optional().describe('Whether the task is completed'),
  result: z.any().optional().describe('Task result text'),
  createdBy: z.number().optional().describe('ID of user who created the task'),
  updatedBy: z.number().optional().describe('ID of user who last updated the task'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix)'),
  updatedAt: z.number().optional().describe('Last update timestamp (Unix)')
});

export let mapLead = (lead: any) => ({
  leadId: lead.id,
  name: lead.name,
  price: lead.price,
  responsibleUserId: lead.responsible_user_id,
  statusId: lead.status_id,
  pipelineId: lead.pipeline_id,
  lossReasonId: lead.loss_reason_id,
  createdBy: lead.created_by,
  updatedBy: lead.updated_by,
  createdAt: lead.created_at,
  updatedAt: lead.updated_at,
  closedAt: lead.closed_at,
  customFieldsValues: lead.custom_fields_values,
  tags: lead._embedded?.tags
});

export let mapContact = (contact: any) => ({
  contactId: contact.id,
  name: contact.name,
  firstName: contact.first_name,
  lastName: contact.last_name,
  responsibleUserId: contact.responsible_user_id,
  createdBy: contact.created_by,
  updatedBy: contact.updated_by,
  createdAt: contact.created_at,
  updatedAt: contact.updated_at,
  customFieldsValues: contact.custom_fields_values,
  tags: contact._embedded?.tags
});

export let mapCompany = (company: any) => ({
  companyId: company.id,
  name: company.name,
  responsibleUserId: company.responsible_user_id,
  createdBy: company.created_by,
  updatedBy: company.updated_by,
  createdAt: company.created_at,
  updatedAt: company.updated_at,
  customFieldsValues: company.custom_fields_values,
  tags: company._embedded?.tags
});

export let mapTask = (task: any) => ({
  taskId: task.id,
  text: task.text,
  responsibleUserId: task.responsible_user_id,
  entityId: task.entity_id,
  entityType: task.entity_type,
  taskTypeId: task.task_type_id,
  completeTill: task.complete_till,
  duration: task.duration,
  isCompleted: task.is_completed,
  result: task.result,
  createdBy: task.created_by,
  updatedBy: task.updated_by,
  createdAt: task.created_at,
  updatedAt: task.updated_at
});

export let buildCustomFieldsPayload = (
  fields: Array<{
    fieldId: number;
    values: Array<{ value?: string | number | boolean; enumId?: number }>;
  }>
) => {
  return fields.map(f => ({
    field_id: f.fieldId,
    values: f.values
      .filter(
        (v): v is { value: string | number | boolean; enumId?: number } =>
          v.value !== undefined
      )
      .map(v => {
        let val: Record<string, any> = { value: v.value };
        if (v.enumId !== undefined) val.enum_id = v.enumId;
        return val;
      })
  }));
};

export let buildTagsPayload = (tags: Array<{ tagId?: number; name?: string }>) => {
  return tags.map(t => {
    if (t.tagId) return { id: t.tagId };
    return { name: t.name };
  });
};
