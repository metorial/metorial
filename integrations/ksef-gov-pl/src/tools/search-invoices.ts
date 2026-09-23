import { SlateTool } from 'slates';
import { z } from 'zod';
import { KsefClient } from '../lib/client';
import { ksefApiError, ksefValidationError } from '../lib/errors';
import { spec } from '../spec';

const invoiceTypeSchema = z.enum([
  'Vat',
  'Zal',
  'Kor',
  'Roz',
  'Upr',
  'KorZal',
  'KorRoz',
  'VatPef',
  'VatPefSp',
  'KorPef',
  'VatRr',
  'KorVatRr'
]);

const buyerIdentifierTypeSchema = z.enum(['Nip', 'VatUe', 'Other', 'None']);

const invoiceMetadataSchema = z.object({
  ksefNumber: z.string(),
  invoiceNumber: z.string(),
  issueDate: z.string(),
  invoicingDate: z.string(),
  acquisitionDate: z.string(),
  permanentStorageDate: z.string(),
  seller: z.object({
    nip: z.string(),
    name: z.string().nullable().optional()
  }),
  buyer: z.object({
    identifier: z.object({
      type: buyerIdentifierTypeSchema,
      value: z.string().nullable().optional()
    }),
    name: z.string().nullable().optional()
  }),
  netAmount: z.number(),
  grossAmount: z.number(),
  vatAmount: z.number(),
  currency: z.string(),
  invoicingMode: z.enum(['Online', 'Offline']),
  invoiceType: invoiceTypeSchema,
  formCode: z.object({
    systemCode: z.string(),
    schemaVersion: z.string(),
    value: z.string()
  }),
  isSelfInvoicing: z.boolean(),
  hasAttachment: z.boolean(),
  invoiceHash: z.string(),
  hashOfCorrectedInvoice: z.string().nullable().optional(),
  thirdSubjects: z
    .array(
      z.object({
        identifier: z.object({
          type: z.enum(['Nip', 'InternalId', 'VatUe', 'Other', 'None']),
          value: z.string().nullable().optional()
        }),
        name: z.string().nullable().optional(),
        role: z.number().int()
      })
    )
    .nullable()
    .optional(),
  authorizedSubject: z
    .object({
      nip: z.string(),
      name: z.string().nullable().optional(),
      role: z.number().int()
    })
    .nullable()
    .optional()
});

const responseSchema = z.object({
  invoices: z.array(invoiceMetadataSchema),
  hasMore: z.boolean(),
  isTruncated: z.boolean(),
  permanentStorageHwmDate: z.string().nullable().optional()
});

const inputSchema = z.object({
  subjectType: z
    .enum(['Subject1', 'Subject2', 'Subject3', 'SubjectAuthorized'])
    .describe(
      'Invoice party role in the authenticated context: seller, buyer, third party, or authorized party.'
    ),
  dateRange: z
    .object({
      dateType: z
        .enum(['Issue', 'Invoicing', 'PermanentStorage'])
        .describe(
          'Date used for filtering and sorting. Use PermanentStorage for incremental searches.'
        ),
      from: z
        .string()
        .describe('Start timestamp in ISO 8601 with Z or an explicit UTC offset.'),
      to: z
        .string()
        .optional()
        .describe(
          'End timestamp in ISO 8601 with Z or an explicit UTC offset; defaults to now.'
        ),
      restrictToPermanentStorageHwmDate: z
        .boolean()
        .optional()
        .describe(
          'For PermanentStorage searches, cap the end date at the stable storage watermark.'
        )
    })
    .describe('Required date window of at most 100 days in UTC.'),
  ksefNumber: z.string().optional().describe('Exact KSeF invoice number.'),
  invoiceNumber: z
    .string()
    .max(256)
    .optional()
    .describe('Exact invoice number assigned by the issuer.'),
  amount: z
    .object({
      type: z.enum(['Brutto', 'Netto', 'Vat']).describe('Gross, net, or VAT amount.'),
      from: z.number().optional().describe('Minimum amount.'),
      to: z.number().optional().describe('Maximum amount.')
    })
    .optional()
    .describe('Amount range.'),
  sellerNip: z
    .string()
    .regex(/^[1-9]((\d[1-9])|([1-9]\d))\d{7}$/)
    .optional()
    .describe('Exact 10-digit seller NIP.'),
  buyerIdentifier: z
    .object({
      type: buyerIdentifierTypeSchema.describe('Buyer identifier type.'),
      value: z.string().max(50).optional().describe('Exact identifier value; omit for None.')
    })
    .optional()
    .describe('Buyer identifier filter.'),
  currencyCodes: z
    .array(z.string().regex(/^[A-Z]{3}$/))
    .optional()
    .describe('Three-letter invoice currency codes, such as PLN and EUR.'),
  invoicingMode: z.enum(['Online', 'Offline']).optional().describe('Invoice issue mode.'),
  isSelfInvoicing: z.boolean().optional().describe('Whether the buyer issued the invoice.'),
  formType: z.enum(['FA', 'PEF', 'FA_RR']).optional().describe('Invoice document form.'),
  invoiceTypes: z.array(invoiceTypeSchema).optional().describe('Invoice types to include.'),
  hasAttachment: z.boolean().optional().describe('Whether the invoice has an attachment.'),
  sortOrder: z
    .enum(['Asc', 'Desc'])
    .optional()
    .describe(
      'Sort direction; defaults to Asc. Truncated Asc searches advance from; Desc searches reduce to.'
    ),
  pageOffset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Zero-based page index; defaults to 0.'),
  pageSize: z
    .number()
    .int()
    .min(10)
    .max(250)
    .optional()
    .describe('Page size from 10 to 250; defaults to 10.')
});

type Timestamp = { milliseconds: number; submillisecond: string };

function parseTimestamp(value: string, field: string): Timestamp {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(
      value
    );
  if (!match) {
    throw ksefValidationError(
      `${field} must be an ISO 8601 timestamp with Z or an explicit UTC offset.`
    );
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fraction = '',
    zone = 'Z'
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const calendarDate = new Date(0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59))
  ) {
    throw ksefValidationError(`${field} is not a valid ISO 8601 timestamp.`);
  }

  const wholeSecond = value.replace(/\.\d+(?=Z|[+-]\d{2}:\d{2}$)/, '');
  const milliseconds = Date.parse(wholeSecond) + Number(fraction.padEnd(3, '0').slice(0, 3));
  if (!Number.isFinite(milliseconds)) {
    throw ksefValidationError(`${field} is not a valid ISO 8601 timestamp.`);
  }
  return { milliseconds, submillisecond: fraction.slice(3) };
}

function compareSubmilliseconds(first: string, second: string): number {
  const precision = Math.max(first.length, second.length);
  const firstDigits = first.padEnd(precision, '0');
  const secondDigits = second.padEnd(precision, '0');
  return firstDigits < secondDigits ? -1 : firstDigits > secondDigits ? 1 : 0;
}

export const searchInvoicesTool = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description:
    'Search KSeF invoice metadata by party role, date range, identifiers, amounts, and document type.',
  instructions: [
    'Use PermanentStorage dates with Asc sorting for incremental searches.',
    'If isTruncated is true, use the last invoice date matching dateRange.dateType to narrow dateRange: raise from for Asc or lower to for Desc, then reset pageOffset to 0. Keep the boundary date included and deduplicate overlaps by ksefNumber. Do not treat truncated results as complete.',
    'Issue metadata gives issueDate as YYYY-MM-DD, while dateRange requires a timestamp. For Asc, use the start of that UTC day for from; for Desc, use the start of the following UTC day for to. Keep the original range if it is already narrower. If one boundary date alone reaches the limit, add other filters.',
    'If hasMore is true and isTruncated is false, request the next pageOffset. The permanentStorageHwmDate marks the stable completeness boundary for PermanentStorage searches; it is not the truncation boundary.'
  ],
  tags: { readOnly: true }
})
  .input(inputSchema)
  .output(
    responseSchema.extend({
      pageOffset: z.number().int(),
      pageSize: z.number().int(),
      sortOrder: z.enum(['Asc', 'Desc']),
      nextPageOffset: z.number().int().nullable(),
      truncationBoundary: z
        .object({
          dateRangeField: z.enum(['from', 'to']),
          dateType: z.enum(['Issue', 'Invoicing', 'PermanentStorage']),
          lastReturnedInvoiceDate: z
            .string()
            .describe(
              'YYYY-MM-DD for Issue; an ISO timestamp for Invoicing or PermanentStorage.'
            ),
          resetPageOffset: z.literal(0)
        })
        .nullable()
        .describe(
          'Date boundary for a truncated search, using the requested date type and sort order.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const input = ctx.input;
    const from = parseTimestamp(input.dateRange.from, 'dateRange.from');
    const to = input.dateRange.to
      ? parseTimestamp(input.dateRange.to, 'dateRange.to')
      : { milliseconds: Date.now(), submillisecond: '' };
    const millisecondSpan = to.milliseconds - from.milliseconds;
    const fractionalOrder = compareSubmilliseconds(to.submillisecond, from.submillisecond);
    if (millisecondSpan < 0 || (millisecondSpan === 0 && fractionalOrder < 0)) {
      throw ksefValidationError('dateRange.to must be later than or equal to dateRange.from.');
    }
    const maxSpan = 100 * 24 * 60 * 60 * 1000;
    if (millisecondSpan > maxSpan || (millisecondSpan === maxSpan && fractionalOrder > 0)) {
      throw ksefValidationError(
        'The date range cannot exceed 100 days in UTC. Narrow dateRange and try again.'
      );
    }
    if (
      input.dateRange.restrictToPermanentStorageHwmDate &&
      input.dateRange.dateType !== 'PermanentStorage'
    ) {
      throw ksefValidationError(
        'restrictToPermanentStorageHwmDate requires dateType PermanentStorage.'
      );
    }
    if (
      input.amount?.from !== undefined &&
      input.amount.to !== undefined &&
      input.amount.from > input.amount.to
    ) {
      throw ksefValidationError('amount.from must be less than or equal to amount.to.');
    }
    if (input.buyerIdentifier) {
      if (input.buyerIdentifier.type === 'None' && input.buyerIdentifier.value !== undefined) {
        throw ksefValidationError(
          'Omit buyerIdentifier.value when buyerIdentifier.type is None.'
        );
      }
      if (
        input.buyerIdentifier.type === 'Nip' &&
        input.buyerIdentifier.value !== undefined &&
        !/^[1-9]((\d[1-9])|([1-9]\d))\d{7}$/.test(input.buyerIdentifier.value)
      ) {
        throw ksefValidationError(
          'buyerIdentifier.value must be a 10-digit NIP when buyerIdentifier.type is Nip.'
        );
      }
    }

    const pageOffset = input.pageOffset ?? 0;
    const pageSize = input.pageSize ?? 10;
    const sortOrder = input.sortOrder ?? 'Asc';
    const {
      pageOffset: _pageOffset,
      pageSize: _pageSize,
      sortOrder: _sortOrder,
      ...filters
    } = input;
    try {
      const rawResponse = await new KsefClient(ctx.auth).request<unknown>(
        'Search invoice metadata',
        'POST',
        '/invoices/query/metadata',
        {
          query: { pageOffset, pageSize, sortOrder },
          body: {
            ...filters,
            // Pin an omitted end date to the same instant used for the 100-day validation.
            dateRange: {
              ...input.dateRange,
              to: input.dateRange.to ?? new Date(to.milliseconds).toISOString()
            }
          },
          safeRead: true
        }
      );
      const parsedResponse = responseSchema.safeParse(rawResponse);
      if (!parsedResponse.success) {
        throw ksefValidationError('KSeF returned an invalid invoice metadata response.');
      }
      const response = parsedResponse.data;
      const lastInvoice = response.invoices.at(-1);
      const lastReturnedInvoiceDate = lastInvoice
        ? input.dateRange.dateType === 'Issue'
          ? lastInvoice.issueDate
          : input.dateRange.dateType === 'Invoicing'
            ? lastInvoice.invoicingDate
            : lastInvoice.permanentStorageDate
        : null;
      const dateRangeField: 'from' | 'to' = sortOrder === 'Asc' ? 'from' : 'to';
      const truncationBoundary =
        response.isTruncated && lastReturnedInvoiceDate
          ? {
              dateRangeField,
              dateType: input.dateRange.dateType,
              lastReturnedInvoiceDate,
              resetPageOffset: 0 as const
            }
          : null;
      const truncationDirection =
        input.dateRange.dateType === 'Issue'
          ? sortOrder === 'Asc'
            ? `The last issueDate is ${lastReturnedInvoiceDate} (date only); raise dateRange.from to the later of its current value and 00:00Z on that UTC day, keeping that day included.`
            : `The last issueDate is ${lastReturnedInvoiceDate} (date only); lower dateRange.to to the earlier of its current value and 00:00Z on the next UTC day, keeping the boundary day included.`
          : `Set dateRange.${dateRangeField} to the last returned ${input.dateRange.dateType} timestamp (${lastReturnedInvoiceDate}), keeping that timestamp included.`;
      return {
        output: {
          ...response,
          pageOffset,
          pageSize,
          sortOrder,
          nextPageOffset: response.hasMore && !response.isTruncated ? pageOffset + 1 : null,
          truncationBoundary
        },
        message: response.isTruncated
          ? `Found ${response.invoices.length} invoice(s). KSeF truncated this search at its 10,000-record limit. ${lastReturnedInvoiceDate ? truncationDirection : `Narrow dateRange.${dateRangeField}.`} Restart at pageOffset 0 and deduplicate overlaps by ksefNumber. If the boundary date alone reaches the limit, add other filters. These results are incomplete.`
          : `Found ${response.invoices.length} invoice(s)${response.hasMore ? '; more pages are available' : ''}.`
      };
    } catch (error) {
      throw ksefApiError(error, 'Search invoice metadata');
    }
  })
  .build();
