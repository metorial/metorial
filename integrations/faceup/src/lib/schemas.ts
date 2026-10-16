import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let statisticsFiltersSchema = z.object({
  dateFrom: z
    .string()
    .optional()
    .describe(
      'ISO 8601 date string to filter statistics from (e.g., "2024-01-01T00:00:00.000Z"). If omitted, returns all available statistics.'
    ),
  dateTo: z.string().optional().describe('End date or ISO 8601 timestamp.'),
  statuses: z.array(z.enum(['Archived', 'Closed', 'Open'])).optional(),
  creationOrigins: z.array(z.enum(['Member', 'Redaction', 'Reporter'])).optional(),
  deadline: z.enum(['Later', 'Overdue', 'Soon', 'Today']).optional(),
  justifications: z.array(z.enum(['Justified', 'Unjustified', 'Unknown'])).optional(),
  priorities: z.array(z.enum(['Low', 'Medium', 'High', 'Urgent'])).optional(),
  sources: z
    .array(z.enum(['Email', 'Hotline', 'InPerson', 'Other', 'Phone', 'ReportingSystem']))
    .optional(),
  tag: z.string().optional().describe('Filter by a case reference tag.'),
  rating: z.number().int().min(1).max(5).optional().describe('Case rating from 1 to 5.'),
  closingReasons: z.array(z.enum(['Resolved', 'Rejected', 'Spam', 'Other'])).optional()
});

export let additionalMetricSchema = z.enum([
  'openReportsCount',
  'archivedReportsCount',
  'closedReportsCount',
  'overdueReportsCount',
  'reportsCount',
  'averageViewTimePercentageChange',
  'averageResolutionTimeChange',
  'reportsCountChange',
  'averageResolutionTime',
  'averageViewTimeHours',
  'reportsBullyingTypeByMonth',
  'reportsByAssignee',
  'reportsByChannel',
  'reportsByCompany',
  'reportsByLabel',
  'reportsByProblems',
  'reportsBySource',
  'reportsByStatus'
]);

export let statisticsInputSchema = statisticsFiltersSchema.extend({
  additionalMetrics: z
    .array(additionalMetricSchema)
    .optional()
    .describe(
      'Additional statistics to retrieve. Monthly report counts are always included. Selected metrics, including any null values, are returned in statistics.'
    )
});

export type StatisticsInput = z.infer<typeof statisticsInputSchema>;

export let employeeSchema = z.object({
  name: z.string().min(1).max(255).describe('Employee full name.'),
  email: z.email().describe('Employee email; FaceUp uses it as the unique identifier.'),
  status: z.enum(['Active', 'Inactive']).describe('Employee status.'),
  location: z.string().max(255).optional(),
  department: z.string().max(255).optional(),
  jobTitle: z.string().max(255).optional(),
  supervisor: z.string().max(255).optional().describe('Supervisor name.')
});

export let syncEmployeesInputSchema = z.object({
  employees: z
    .array(employeeSchema)
    .min(1)
    .max(1000)
    .describe(
      'Employees to create or update by email. Send at most 1,000 per request. Employees omitted from this batch remain unchanged.'
    )
});

export type Employee = z.infer<typeof employeeSchema>;

export let rawReportSchema = z
  .object({
    id: z.string().min(1),
    tag: z.string(),
    origin: z.string(),
    justification: z.string(),
    priority: z.string().nullable(),
    status: z.string().min(1),
    source: z.string(),
    created_at: z.iso.datetime({ offset: true })
  })
  .passthrough();

export let parseFaceUpResponse = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  resource: string
) => {
  let parsed = schema.safeParse(data);
  if (!parsed.success) {
    let fields = parsed.error.issues
      .map(issue => issue.path.map(String).join('.') || resource)
      .join(', ');
    throw createApiServiceError(
      `FaceUp returned an invalid ${resource} response (${fields}).`,
      { reason: 'faceup_invalid_response' }
    );
  }
  return parsed.data;
};
