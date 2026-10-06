import { z } from 'zod';
import {
  documentInput,
  mapDocumentInput,
  mapRecurring,
  recurringOutput
} from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  date,
  dateInput,
  idInput,
  invalid,
  pageInput,
  pageOutput,
  reject,
  safeInteger
} from '../lib/validation';
export const listRecurring = tool({
  name: 'List Recurring Documents',
  key: 'list_recurring',
  description:
    'List recurring invoice templates, or retrieve one with recurringId alone. These records can automatically generate future financial documents.',
  readOnly: true,
  input: { ...pageInput, recurringId: idInput.optional() },
  output: { recurringDocuments: z.array(z.object(recurringOutput)), ...pageOutput },
  run: async (input, client) => {
    if (input.recurringId) {
      if (Object.entries(input).some(([k, v]) => k !== 'recurringId' && v !== undefined))
        throw invalid('Use recurringId alone for an exact read.');
      return {
        recurringDocuments: [mapRecurring(await client.get('recurring', input.recurringId))]
      };
    }
    return {
      recurringDocuments: (await client.list('recurring', input)).map(mapRecurring),
      ...client.pagination
    };
  }
});
export const createRecurring = tool({
  name: 'Create Recurring Document',
  key: 'create_recurring',
  description:
    'Create a recurring invoice template that can automatically generate future invoices. Delete the template to stop future generation; already generated documents remain. frequency is retained and mapped to current period fields.',
  input: {
    ...documentInput,
    startDate: dateInput,
    frequency: z.enum([
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'bimonthly',
      'quarterly',
      'semiyearly',
      'yearly'
    ]),
    documentType: z
      .enum(['invoice', 'expense', 'estimate'])
      .optional()
      .describe(
        'Compatibility field: only invoice is supported by the current recurring API.'
      ),
    endingCount: safeInteger
      .positive()
      .optional()
      .describe('Legacy field not supported by the current API; use endingDate instead.'),
    endingDate: dateInput.optional()
  },
  output: recurringOutput,
  run: async (input, client) => {
    reject(
      input,
      ['endingCount', 'issueDate', 'dueDate'],
      'The current recurring API does not accept endingCount, issueDate or dueDate. Use startDate and endingDate.'
    );
    if (input.documentType !== undefined && input.documentType !== 'invoice')
      throw invalid(
        'The current recurring API creates invoice templates. Only documentType invoice is supported.'
      );
    const data = mapDocumentInput(input, 'recurring');
    data.start_date = date(input.startDate);
    if (input.endingDate) {
      data.end_date = date(input.endingDate);
      if (input.endingDate < input.startDate)
        throw invalid('endingDate must not precede startDate.');
    }
    const frequency = {
      daily: ['days', 1],
      weekly: ['weeks', 1],
      biweekly: ['weeks', 2],
      monthly: ['months', 1],
      bimonthly: ['months', 2],
      quarterly: ['months', 3],
      semiyearly: ['months', 6],
      yearly: ['years', 1]
    } as const;
    const [period, count] = frequency[input.frequency];
    data.recurring_period = period;
    data.recurring_frequency = count;
    return mapRecurring(await client.create('recurring', data));
  }
});
export const deleteRecurring = tool({
  name: 'Delete Recurring Document',
  key: 'delete_recurring',
  description:
    'Delete a recurring invoice template to stop future generation. Existing generated documents remain.',
  destructive: true,
  input: { recurringId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.get('recurring', input.recurringId);
    await client.remove('recurring', input.recurringId);
    return { success: true };
  }
});
