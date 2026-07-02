import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listRoutingForms = SlateTool.create(spec, {
  name: 'List Routing Forms',
  key: 'list_routing_forms',
  description: `List routing forms and optionally their submissions for an organization. Routing forms direct visitors to specific people or destinations based on qualifying criteria like industry, company size, and interests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationUri: z
        .string()
        .describe('URI of the organization to list routing forms for'),
      routingFormUri: z
        .string()
        .optional()
        .describe(
          'If provided, lists submissions for this specific routing form instead of listing forms'
        ),
      count: z.number().optional().describe('Number of results per page (max 100)'),
      pageToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .output(
    z.object({
      routingForms: z
        .array(
          z.object({
            routingFormUri: z.string().describe('Unique URI of the routing form'),
            name: z.string().describe('Routing form name'),
            status: z.string().describe('Form status'),
            questions: z.array(z.any()).describe('Form questions configuration'),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional()
        .describe('Routing forms (when not querying submissions)'),
      submissions: z
        .array(
          z.object({
            submissionUri: z.string().describe('Unique URI of the submission'),
            routingFormUri: z.string().describe('URI of the routing form'),
            questionsAndAnswers: z.array(
              z.object({
                questionUuid: z.string(),
                question: z.string(),
                answer: z.string()
              })
            ),
            tracking: z.any().optional(),
            result: z
              .any()
              .optional()
              .describe('Routing result (where the submitter was directed)'),
            submitter: z.string().nullable(),
            submitterType: z.string().nullable(),
            createdAt: z.string(),
            updatedAt: z.string()
          })
        )
        .optional()
        .describe('Submissions for a specific routing form'),
      nextPageToken: z
        .string()
        .nullable()
        .describe('Token for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.routingFormUri) {
      let result = await client.listRoutingFormSubmissions({
        routingFormUri: ctx.input.routingFormUri,
        count: ctx.input.count,
        pageToken: ctx.input.pageToken
      });

      let submissions = result.collection.map(s => ({
        submissionUri: s.uri,
        routingFormUri: s.routingForm,
        questionsAndAnswers: s.questionsAndAnswers,
        tracking: s.tracking,
        result: s.result,
        submitter: s.submitter,
        submitterType: s.submitterType,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }));

      return {
        output: {
          submissions,
          nextPageToken: result.pagination.nextPageToken
        },
        message: `Found **${submissions.length}** routing form submissions.${result.pagination.nextPageToken ? ' More results available.' : ''}`
      };
    } else {
      let result = await client.listRoutingForms({
        organizationUri: ctx.input.organizationUri,
        count: ctx.input.count,
        pageToken: ctx.input.pageToken
      });

      let routingForms = result.collection.map(f => ({
        routingFormUri: f.uri,
        name: f.name,
        status: f.status,
        questions: f.questions,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }));

      return {
        output: {
          routingForms,
          nextPageToken: result.pagination.nextPageToken
        },
        message: `Found **${routingForms.length}** routing forms.${result.pagination.nextPageToken ? ' More results available.' : ''}`
      };
    }
  })
  .build();
