import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { testRequestSchema } from '../lib/models';
import { spec } from '../spec';

const error = z.object({ message: z.string(), eventIndex: z.number().optional() });
export const testTransformations = SlateTool.create(spec, {
  key: 'test_transformations',
  name: 'Test Transformation Revisions',
  description:
    'Validate requested transformation and library revision IDs before publication. Supply named test cases with input events and optional expected output. Reports test pass/fail and observed output; it does not publish or connect revisions.',
  instructions: [
    'Discover exact revision IDs with list_transformation_versions/list_library_versions and inspect them with the version readback tools.',
    'Tests execute supplied code. Review code, imports and event data before execution; code can access external services. Use controlled synthetic events for test fixtures.'
  ],
  tags: { destructive: true }
})
  .input(testRequestSchema)
  .output(
    z.object({
      pass: z.boolean(),
      transformations: z.array(
        z.object({
          transformationId: z.string(),
          versionId: z.string(),
          name: z.string(),
          pass: z.boolean(),
          status: z.enum(['pass', 'fail', 'error']).optional(),
          results: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              status: z.enum(['pass', 'fail', 'error']),
              actualOutput: z.array(z.unknown()).optional(),
              errors: z.array(error).optional()
            })
          )
        })
      ),
      libraries: z.array(
        z.object({
          libraryId: z.string(),
          versionId: z.string(),
          name: z.string(),
          pass: z.boolean(),
          handleName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).testTransformations(ctx.input);
    return {
      output: {
        pass: result.pass,
        transformations: (result.validationOutput.transformations ?? []).map(value => ({
          transformationId: value.id,
          versionId: value.versionId,
          name: value.name,
          pass: value.pass,
          status: value.testResult?.status,
          results: (value.testResult?.results ?? []).map(test => ({
            id: test.id,
            name: test.name,
            status: test.status,
            actualOutput: test.actualOutput,
            errors: test.errors
          }))
        })),
        libraries: (result.validationOutput.libraries ?? []).map(value => ({
          libraryId: value.id,
          versionId: value.versionId,
          name: value.name,
          pass: value.pass,
          handleName: value.handleName
        }))
      },
      message: result.pass
        ? 'Requested revision validation passed. No publication or destination change was requested.'
        : 'Requested revision validation failed. Inspect the per-revision and test-case results before publishing.'
    };
  })
  .build();
