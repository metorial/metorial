import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { DiscoveryClient } from '../lib/client';
import { parseTicketmasterOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  classification: z
    .record(z.string(), z.any())
    .describe(
      'Complete provider classification object, including nested genres and sub-genres when supplied'
    )
});

export let getClassificationDetailsTool = SlateTool.create(spec, {
  name: 'Get Classification Details',
  key: 'get_classification_details',
  description:
    'Look up a classification by ID and retrieve its complete segment, genre, or sub-genre hierarchy. Use browse_classifications to discover IDs, then use returned classification IDs to filter searches.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      classificationId: z
        .string()
        .describe(
          'Classification ID from browse_classifications or event/attraction classifications'
        )
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DiscoveryClient({ token: ctx.auth.token, locale: ctx.config.locale });
    let classification = await client.getClassificationDetails(ctx.input.classificationId);
    if (!isApiErrorRecord(classification)) {
      throw createApiServiceError(
        'Ticketmaster returned an invalid classification response.',
        { reason: 'invalid_classification_response' }
      );
    }
    return {
      output: parseTicketmasterOutput(
        outputSchema,
        { classification },
        'get-classification-details'
      ),
      message: `Retrieved classification ${ctx.input.classificationId}.`
    };
  })
  .build();
