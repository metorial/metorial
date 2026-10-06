import { z } from 'zod';

const nullableString = z
  .string()
  .nullish()
  .transform(value => value ?? null);
const destination = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  enabled: z.boolean().optional()
});
const destinations = z
  .array(z.union([z.string().min(1), destination]))
  .optional()
  .transform(values =>
    values?.map(value => (typeof value === 'string' ? { id: value } : value))
  );
const common = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  name: z.string(),
  description: nullableString,
  language: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isPublished: z.boolean().optional()
});
export const transformationMetadataSchema = common.extend({
  codeVersion: nullableString,
  destinations
});
export const transformationSchema = transformationMetadataSchema.extend({ code: z.string() });
export const libraryMetadataSchema = common.extend({ importName: nullableString });
export const librarySchema = libraryMetadataSchema.extend({ code: z.string() });
export const transformationVersionSchema = transformationSchema.extend({
  name: nullableString
});
export const libraryVersionSchema = librarySchema.extend({ name: nullableString });
export const testDefinitionSchema = z.object({
  id: z.string().describe('Stable ID for this test case, used to match provider results.'),
  name: z.string().describe('Human-readable test case name.'),
  description: z.string().optional(),
  input: z
    .array(z.unknown())
    .describe('Nonempty JSON event array supplied to the revision under test.'),
  expectedOutput: z
    .array(z.unknown())
    .optional()
    .describe('Optional expected JSON output for provider validation.')
});
export const testRequestSchema = z.object({
  transformations: z
    .array(
      z.object({
        versionId: z
          .string()
          .describe('Exact transformation revision ID from list_transformation_versions.'),
        testSuite: z
          .array(testDefinitionSchema)
          .describe('Nonempty named test cases to execute for this revision.')
      })
    )
    .optional(),
  libraries: z
    .array(
      z.object({
        versionId: z
          .string()
          .describe(
            'Exact library revision ID from list_library_versions to validate alongside transformations.'
          )
      })
    )
    .optional()
});
const testError = z
  .object({ eventIndex: z.number().int().nonnegative().optional() })
  .transform(value => ({ ...value, message: 'Test execution reported an error.' }));
const testResult = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  status: z.enum(['pass', 'fail', 'error']),
  actualOutput: z.array(z.unknown()).optional(),
  errors: z.array(testError).optional()
});
export const testResponseSchema = z.object({
  pass: z.boolean(),
  validationOutput: z.object({
    transformations: z
      .array(
        z.object({
          id: z.string(),
          versionId: z.string(),
          name: z.string(),
          pass: z.boolean(),
          testResult: z
            .object({
              status: z.enum(['pass', 'fail', 'error']),
              results: z.array(testResult)
            })
            .optional()
        })
      )
      .optional(),
    libraries: z
      .array(
        z.object({
          id: z.string(),
          versionId: z.string(),
          name: z.string(),
          handleName: z.string().optional(),
          pass: z.boolean()
        })
      )
      .optional()
  })
});
export const destinationOutputSchema = z.array(destination).optional();
