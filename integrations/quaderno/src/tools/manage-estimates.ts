import { z } from 'zod';
import {
  documentInput,
  documentOutputSchema,
  mapDocumentInput,
  mapDocumentOutput
} from '../lib/schemas';
import { tool } from '../lib/tool';
import {
  date,
  dateInput,
  idInput,
  pageInput,
  pageOutput,
  safeInteger
} from '../lib/validation';

export const listEstimates = tool({
  name: 'List Estimates',
  key: 'list_estimates',
  description:
    'List a cursor page of estimates. Date accepts a single day or start,end range.',
  readOnly: true,
  input: {
    ...pageInput,
    query: z.string().optional(),
    date: z.string().optional(),
    state: z.enum(['outstanding', 'accepted', 'declined', 'invoiced', 'late']).optional(),
    contactId: idInput.optional()
  },
  output: { estimates: z.array(documentOutputSchema), ...pageOutput },
  run: async (input, client) => ({
    estimates: (
      await client.list('proformas', input, {
        q: input.query,
        date: input.date,
        state: input.state,
        contact: input.contactId
      })
    ).map(mapDocumentOutput),
    ...client.pagination
  })
});
export const getEstimate = tool({
  name: 'Get Estimate',
  key: 'get_estimate',
  description: 'Retrieve one estimate and its provider-calculated amounts.',
  readOnly: true,
  input: { estimateId: idInput },
  output: documentOutputSchema.shape,
  run: async (input, client) =>
    mapDocumentOutput(await client.get('proformas', input.estimateId))
});
export const createEstimate = tool({
  name: 'Create Estimate',
  key: 'create_estimate',
  description:
    'Create an estimate using the current proforma API. The provider sets issueDate. The record may be retained because current proforma deletion is not documented.',
  input: {
    ...documentInput,
    validUntil: dateInput.optional(),
    dueDays: safeInteger.nonnegative().optional()
  },
  output: documentOutputSchema.shape,
  run: async (input, client) => {
    const data = mapDocumentInput(input, 'proformas');
    if (input.validUntil !== undefined) data.valid_until = date(input.validUntil);
    if (input.dueDays !== undefined) data.due_days = input.dueDays;
    return mapDocumentOutput(await client.create('proformas', data));
  }
});
export const deleteEstimate = tool({
  name: 'Delete Estimate',
  key: 'delete_estimate',
  description:
    'Compatibility deletion for a legacy estimate ID using the historical estimates route. Current proforma deletion is not documented; do not assume new estimates are deletable.',
  destructive: true,
  input: { estimateId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.remove('estimates', input.estimateId, true);
    return { success: true };
  }
});
export const deliverEstimate = tool({
  name: 'Deliver Estimate',
  key: 'deliver_estimate',
  description:
    'Ask Quaderno to email the estimate to its contact. This may finalize the record. A successful request confirms initiation, not receipt.',
  input: { estimateId: idInput },
  output: { success: z.boolean() },
  run: async (input, client) => {
    await client.deliver('proformas', input.estimateId);
    return { success: true };
  }
});
