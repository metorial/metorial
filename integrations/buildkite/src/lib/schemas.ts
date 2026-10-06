import { z } from 'zod';
export const organizationInput = {
  organizationSlug: z
    .string()
    .optional()
    .describe(
      'Organization slug. Call list_organizations to discover accessible organizations; defaults to the connection organization when set.'
    )
};
export const paginationInput = {
  page: z.number().optional().describe('Page number, starting at 1.'),
  perPage: z.number().optional().describe('Results per page, from 1 to 100.')
};
export const paginationOutput = {
  nextPage: z
    .number()
    .nullable()
    .describe(
      'Next page from the provider pagination header, or null when there is no next page.'
    )
};
export const pipelineSlugSchema = z
  .string()
  .describe('Pipeline slug. Call list_pipelines to discover it.');
export const buildNumberSchema = z
  .number()
  .describe('Pipeline build number from list_builds, not a build UUID.');
export const jobIdSchema = z.string().describe('Job UUID from get_build.');
