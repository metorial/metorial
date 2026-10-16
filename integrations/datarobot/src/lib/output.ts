import { createApiServiceError } from 'slates';
import type { z } from 'zod';

export function parseOutput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  let result = schema.safeParse(value);
  if (!result.success) {
    let paths = result.error.issues.map(issue => issue.path.join('.') || 'response');
    throw createApiServiceError(
      `DataRobot returned invalid response fields: ${paths.join(', ')}.`
    );
  }
  return result.data;
}
