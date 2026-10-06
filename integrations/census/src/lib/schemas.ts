import { z } from 'zod';
export const workspaceId = z
  .number()
  .optional()
  .describe(
    'Workspace ID from list_workspaces. Required for a personal token; optional workspace-key identity check.'
  );
export const allPages = z
  .boolean()
  .optional()
  .describe(
    'Follow every documented next_page from the requested page. Default returns one page.'
  );
export const paginationInput = {
  page: z.number().optional().describe('Page number; starts at 1 (0 selects page 1).'),
  perPage: z.number().optional().describe('Results per page, 1–100.'),
  order: z.enum(['asc', 'desc']).optional().describe('Creation-time order.'),
  allPages
};
export const paginationOutput = {
  totalRecords: z
    .number()
    .optional()
    .describe('Provider-reported collection total, when supplied.'),
  currentPage: z.number().optional().describe('Last returned provider page.'),
  lastPage: z.number().optional(),
  nextPage: z.number().nullable().optional(),
  returnedCount: z.number().describe('Number of rows returned in this response.')
};
export const pageMetadata = (
  count: number,
  page?: { totalRecords?: number; page?: number; lastPage?: number; nextPage?: number | null }
) => ({
  totalRecords: page?.totalRecords,
  currentPage: page?.page,
  lastPage: page?.lastPage,
  nextPage: page?.nextPage,
  returnedCount: count
});
export const webhookEvents = z.array(
  z.enum([
    'sync.alert.raised',
    'sync.alert.resolved',
    'sync.triggered',
    'sync.started',
    'sync.completed',
    'sync.success',
    'sync.failed'
  ])
);
