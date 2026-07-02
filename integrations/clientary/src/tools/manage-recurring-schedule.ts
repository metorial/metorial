import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let scheduleItemSchema = z.object({
  scheduleItemId: z.number().optional().describe('ID of the schedule item'),
  title: z.string().describe('Line item title'),
  quantity: z.number().describe('Quantity'),
  price: z.number().describe('Unit price'),
  taxable: z.boolean().optional().describe('Subject to first tax'),
  taxable2: z.boolean().optional().describe('Subject to second tax'),
  taxable3: z.boolean().optional().describe('Subject to third tax')
});

let scheduleSchema = z.object({
  scheduleId: z.number().describe('Unique ID of the recurring schedule'),
  clientId: z.number().optional().describe('Associated client ID'),
  currencyCode: z.string().optional().describe('Currency code (e.g. USD)'),
  status: z.number().optional().describe('Status: 0 = Active, 1 = Paused, 2 = Stopped'),
  action: z.number().optional().describe('Action: 0 = Send, 1 = Draft, 2 = Autobill'),
  timeInterval: z
    .string()
    .optional()
    .describe('Recurrence interval (e.g. monthly, weekly, quarterly)'),
  nextDate: z.string().optional().describe('Next scheduled date (YYYY-MM-DD)'),
  duePeriod: z.number().optional().describe('Number of days until invoice is due'),
  occurrences: z.number().optional().describe('Total occurrences (0 = unlimited)'),
  occurrencesRemaining: z.number().optional().describe('Remaining occurrences'),
  tax: z.number().optional().describe('First tax rate percentage'),
  tax2: z.number().optional().describe('Second tax rate percentage'),
  tax3: z.number().optional().describe('Third tax rate percentage'),
  notes: z.string().optional().describe('Notes to appear on generated invoices'),
  poNumber: z.string().optional().describe('Purchase order number'),
  items: z.array(scheduleItemSchema).optional().describe('Schedule line items')
});

export let createRecurringSchedule = SlateTool.create(spec, {
  name: 'Create Recurring Schedule',
  key: 'create_recurring_schedule',
  description: `Create a recurring invoice schedule that automatically generates invoices at specified intervals. Supports weekly, biweekly, semimonthly, monthly, quarterly, semiannually, annually, and more.`,
  instructions: [
    'Action "Autobill" requires a valid payment profile for the client.',
    'Set occurrences to 0 for unlimited recurrence.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      clientId: z.number().describe('Client ID for the recurring invoices'),
      currencyCode: z.string().describe('Currency code (e.g. USD)'),
      nextDate: z.string().describe('First/next scheduled date (YYYY-MM-DD)'),
      duePeriod: z.number().describe('Days until invoice is due after generation'),
      timeInterval: z
        .string()
        .describe(
          'Recurrence interval: weekly, biweekly, semimonthly, monthly, quarterly, semiannually, annually'
        ),
      action: z
        .number()
        .optional()
        .describe('Action on recurrence: 0 = Send, 1 = Draft, 2 = Autobill'),
      occurrences: z.number().optional().describe('Total occurrences (0 = unlimited)'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      notes: z.string().optional().describe('Notes for generated invoices'),
      poNumber: z.string().optional().describe('Purchase order number'),
      items: z
        .array(
          z.object({
            title: z.string().describe('Line item title'),
            quantity: z.number().describe('Quantity'),
            price: z.number().describe('Unit price'),
            taxable: z.boolean().optional().describe('Subject to first tax'),
            taxable2: z.boolean().optional().describe('Subject to second tax'),
            taxable3: z.boolean().optional().describe('Subject to third tax')
          })
        )
        .optional()
        .describe('Line items for each generated invoice')
    })
  )
  .output(scheduleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {
      client_id: ctx.input.clientId,
      currency_code: ctx.input.currencyCode,
      next_date: ctx.input.nextDate,
      due_period: ctx.input.duePeriod,
      time_interval: ctx.input.timeInterval
    };
    if (ctx.input.action !== undefined) data.action = ctx.input.action;
    if (ctx.input.occurrences !== undefined) data.occurrences = ctx.input.occurrences;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;
    if (ctx.input.notes) data.notes = ctx.input.notes;
    if (ctx.input.poNumber) data.po_number = ctx.input.poNumber;

    if (ctx.input.items) {
      data.recurring_schedule_items_attributes = ctx.input.items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }));
    }

    let result = await client.createRecurringSchedule(data);
    let s = result.recurring_schedule || result;

    return {
      output: mapSchedule(s),
      message: `Created recurring schedule (ID: ${s.id}) — ${ctx.input.timeInterval} for client ID ${ctx.input.clientId}.`
    };
  })
  .build();

export let updateRecurringSchedule = SlateTool.create(spec, {
  name: 'Update Recurring Schedule',
  key: 'update_recurring_schedule',
  description: `Update an existing recurring schedule. Can modify interval, status, line items, and other settings. To manage items: omit \`scheduleItemId\` to add new, include it to update, set \`destroy\` to true to remove.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      scheduleId: z.number().describe('ID of the recurring schedule to update'),
      status: z.number().optional().describe('Status: 0 = Active, 1 = Paused, 2 = Stopped'),
      action: z.number().optional().describe('Action: 0 = Send, 1 = Draft, 2 = Autobill'),
      timeInterval: z.string().optional().describe('Recurrence interval'),
      nextDate: z.string().optional().describe('Next scheduled date (YYYY-MM-DD)'),
      duePeriod: z.number().optional().describe('Days until due'),
      occurrences: z.number().optional().describe('Total occurrences (0 = unlimited)'),
      tax: z.number().optional().describe('First tax rate percentage'),
      tax2: z.number().optional().describe('Second tax rate percentage'),
      tax3: z.number().optional().describe('Third tax rate percentage'),
      notes: z.string().optional().describe('Notes'),
      poNumber: z.string().optional().describe('Purchase order number'),
      items: z
        .array(
          z.object({
            scheduleItemId: z
              .number()
              .optional()
              .describe('ID of existing item to update. Omit for new items.'),
            title: z.string().optional().describe('Line item title'),
            quantity: z.number().optional().describe('Quantity'),
            price: z.number().optional().describe('Unit price'),
            destroy: z.boolean().optional().describe('Set true to remove this item')
          })
        )
        .optional()
        .describe('Line items to add, update, or remove')
    })
  )
  .output(scheduleSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    let data: Record<string, any> = {};
    if (ctx.input.status !== undefined) data.status = ctx.input.status;
    if (ctx.input.action !== undefined) data.action = ctx.input.action;
    if (ctx.input.timeInterval !== undefined) data.time_interval = ctx.input.timeInterval;
    if (ctx.input.nextDate !== undefined) data.next_date = ctx.input.nextDate;
    if (ctx.input.duePeriod !== undefined) data.due_period = ctx.input.duePeriod;
    if (ctx.input.occurrences !== undefined) data.occurrences = ctx.input.occurrences;
    if (ctx.input.tax !== undefined) data.tax = ctx.input.tax;
    if (ctx.input.tax2 !== undefined) data.tax2 = ctx.input.tax2;
    if (ctx.input.tax3 !== undefined) data.tax3 = ctx.input.tax3;
    if (ctx.input.notes !== undefined) data.notes = ctx.input.notes;
    if (ctx.input.poNumber !== undefined) data.po_number = ctx.input.poNumber;

    if (ctx.input.items) {
      data.recurring_schedule_items_attributes = ctx.input.items.map(item => {
        let mapped: Record<string, any> = {};
        if (item.scheduleItemId) mapped.id = item.scheduleItemId;
        if (item.title !== undefined) mapped.title = item.title;
        if (item.quantity !== undefined) mapped.quantity = item.quantity;
        if (item.price !== undefined) mapped.price = item.price;
        if (item.destroy) mapped._destroy = true;
        return mapped;
      });
    }

    let result = await client.updateRecurringSchedule(ctx.input.scheduleId, data);
    let s = result.recurring_schedule || result;

    return {
      output: mapSchedule(s),
      message: `Updated recurring schedule ID ${s.id}.`
    };
  })
  .build();

export let getRecurringSchedules = SlateTool.create(spec, {
  name: 'Get Recurring Schedules',
  key: 'get_recurring_schedules',
  description: `Retrieve a specific recurring schedule by ID or list all recurring schedules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z
        .number()
        .optional()
        .describe('ID of a specific schedule. If omitted, lists all schedules.'),
      page: z.number().optional().describe('Page number for pagination (30 results per page)')
    })
  )
  .output(
    z.object({
      schedules: z.array(scheduleSchema).describe('List of recurring schedules'),
      totalCount: z.number().optional().describe('Total number of schedules'),
      pageCount: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.scheduleId) {
      let result = await client.getRecurringSchedule(ctx.input.scheduleId);
      let s = result.recurring_schedule || result;
      return {
        output: { schedules: [mapSchedule(s)] },
        message: `Retrieved recurring schedule ID ${s.id}.`
      };
    }

    let result = await client.listRecurringSchedules({ page: ctx.input.page });
    let schedules = (result.recurring_schedules || []).map(mapSchedule);

    return {
      output: {
        schedules,
        totalCount: result.total_count,
        pageCount: result.page_count
      },
      message: `Retrieved ${schedules.length} recurring schedule(s).`
    };
  })
  .build();

export let deleteRecurringSchedule = SlateTool.create(spec, {
  name: 'Delete Recurring Schedule',
  key: 'delete_recurring_schedule',
  description: `Permanently delete a recurring schedule. Previously generated invoices are not affected.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      scheduleId: z.number().describe('ID of the recurring schedule to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });
    await client.deleteRecurringSchedule(ctx.input.scheduleId);

    return {
      output: { success: true },
      message: `Deleted recurring schedule ID ${ctx.input.scheduleId}.`
    };
  })
  .build();

let mapSchedule = (s: any) => ({
  scheduleId: s.id,
  clientId: s.client_id,
  currencyCode: s.currency_code,
  status: s.status,
  action: s.action,
  timeInterval: s.time_interval,
  nextDate: s.next_date,
  duePeriod: s.due_period,
  occurrences: s.occurrences,
  occurrencesRemaining: s.occurrences_remaining,
  tax: s.tax,
  tax2: s.tax2,
  tax3: s.tax3,
  notes: s.notes,
  poNumber: s.po_number,
  items: s.recurring_schedule_items
    ? s.recurring_schedule_items.map((item: any) => ({
        scheduleItemId: item.id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        taxable: item.taxable,
        taxable2: item.taxable2,
        taxable3: item.taxable3
      }))
    : undefined
});
