import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getToxicityResults = SlateTool.create(spec, {
  name: 'Get Toxicity Results',
  key: 'get_toxicity_results',
  description: `Download the results of a completed toxicity check job. Returns toxicity scores for each email address on a scale of 1–5. Higher scores indicate higher probability of the address being a spam trap or otherwise harmful.`,
  instructions: [
    'The toxicity job must be in **completed** status before results can be downloaded.',
    'Use the **Get Toxicity Status** tool to check if the job is ready.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The toxicity job ID returned from creating a toxicity check')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            email: z.string().describe('The email address'),
            toxicity: z
              .number()
              .describe('Toxicity score from 0 to 5. Higher means more likely to be harmful.')
          })
        )
        .describe('Toxicity results for each email'),
      total: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results = await client.getToxicityResults(ctx.input.jobId);

    let toxicCount = results.filter(r => r.toxicity >= 3).length;

    return {
      output: { results, total: results.length },
      message: `Downloaded toxicity results for **${results.length}** emails. **${toxicCount}** have high toxicity (score ≥ 3).`
    };
  })
  .build();
