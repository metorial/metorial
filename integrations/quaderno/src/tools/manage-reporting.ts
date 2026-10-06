import { z } from 'zod';
import { tool } from '../lib/tool';
import {
  date,
  dateInput,
  idInput,
  integerValue,
  invalid,
  isoUnix,
  object,
  reject,
  resource,
  resourceId,
  safeInteger,
  stringValue
} from '../lib/validation';

const output = {
  reportRequestId: z.string().optional(),
  reportType: z.string().optional(),
  state: z.string().optional(),
  parameters: z.unknown().optional(),
  downloadUrl: z
    .string()
    .optional()
    .describe('Legacy field; current reports are provided as downloadable files.'),
  createdAt: z.string().optional(),
  createdAtUnix: safeInteger.optional(),
  completedAtUnix: safeInteger.optional(),
  downloadAvailable: z.boolean()
};
function report(value: unknown) {
  const r = resource(value);
  const parameters = r.parameters === undefined ? {} : object(r.parameters);
  const created = integerValue(r.created_at);
  return {
    reportRequestId: resourceId(r.id),
    reportType: stringValue(r.report_type),
    state: stringValue(r.state),
    parameters: {
      from_date: stringValue(parameters.from_date),
      to_date: stringValue(parameters.to_date)
    },
    createdAt: created === undefined ? undefined : isoUnix(created),
    createdAtUnix: created,
    completedAtUnix: integerValue(r.completed_at),
    downloadAvailable: typeof r.report_url === 'string' && !!r.report_url
  };
}
async function addReport(
  value: unknown,
  addDownload: (value: {
    type: 'url';
    url: string;
    mimeType: string;
    filename?: string;
  }) => Promise<unknown>
) {
  const r = resource(value);
  if (r.report_url !== undefined && r.report_url !== null) {
    if (typeof r.report_url !== 'string' || !r.report_url)
      throw invalid('Quaderno returned an invalid report download.');
    let url: URL;
    try {
      url = new URL(r.report_url);
    } catch {
      throw invalid('Quaderno returned an invalid report download.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw invalid('Quaderno returned an invalid report download.');
    await addDownload({
      type: 'url',
      url: url.toString(),
      mimeType: 'text/csv',
      filename: `quaderno-report-${resourceId(r.id)}.csv`
    });
  }
  return report(r);
}
export const createReport = tool({
  name: 'Request Tax Report',
  key: 'request_tax_report',
  description:
    'Request an asynchronous CSV report. Current report types are tax_summary, invoices_list and credits_list. Dates are supplied as a range. Poll get_report_status until the provider reports completion.',
  input: {
    reportType: z.string().describe('tax_summary, invoices_list or credits_list.'),
    startDate: dateInput.optional(),
    endDate: dateInput.optional(),
    country: z
      .string()
      .optional()
      .describe('Legacy filter unsupported by the current reporting API.'),
    region: z
      .string()
      .optional()
      .describe('Legacy filter unsupported by the current reporting API.')
  },
  output,
  run: async (input, client, addDownload) => {
    if (!['tax_summary', 'invoices_list', 'credits_list'].includes(input.reportType))
      throw invalid('Use reportType tax_summary, invoices_list or credits_list.');
    reject(
      input,
      ['country', 'region'],
      'The current reporting API accepts date filters only. Filter the downloaded report by country or region instead.'
    );
    if (input.startDate !== undefined) date(input.startDate);
    if (input.endDate !== undefined) date(input.endDate);
    if (input.startDate && input.endDate && input.startDate > input.endDate)
      throw invalid('endDate must not precede startDate.');
    return addReport(
      await client.create('reporting/requests', {
        report_type: input.reportType,
        parameters: { from_date: input.startDate, to_date: input.endDate }
      }),
      addDownload
    );
  }
});
export const getReportStatus = tool({
  name: 'Get Report Status',
  key: 'get_report_status',
  description:
    'Retrieve the current state of a report request and provide its downloadable CSV when the provider supplies one. Pending and failed requests do not imply a completed report.',
  readOnly: true,
  input: { reportRequestId: idInput },
  output,
  run: async (input, client, addDownload) =>
    addReport(await client.get('reporting/requests', input.reportRequestId), addDownload)
});
