import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description: `Retrieve configuration and reference data such as carriers, product lines, employees, pipelines, lead sources, and more. Use this to look up valid IDs and values for use in other tools.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dataType: z
        .enum([
          'carriers',
          'product_lines',
          'product_categories',
          'employees',
          'lead_sources',
          'lead_source_categories',
          'locations',
          'loss_reasons',
          'custom_fields',
          'pipelines',
          'pipeline_stages',
          'service_categories',
          'service_priorities',
          'service_resolutions',
          'assign_groups',
          'csrs',
          'business_classifications',
          'life_professionals'
        ])
        .describe(
          'Type of reference data to retrieve. Determines which API endpoint is called.'
        ),
      pipelineId: z
        .string()
        .optional()
        .describe(
          'Pipeline ID, required when dataType is "pipeline_stages" to fetch stages for a specific pipeline'
        ),
      searchQuery: z
        .string()
        .optional()
        .describe(
          'Search query string, used when dataType is "business_classifications" to filter results'
        )
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Array of reference data items returned from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result: any;
    let label = ctx.input.dataType.replace(/_/g, ' ');

    switch (ctx.input.dataType) {
      case 'carriers':
        result = await client.getCarriers();
        break;
      case 'product_lines':
        result = await client.getProductLines();
        break;
      case 'product_categories':
        result = await client.getProductCategories();
        break;
      case 'employees':
        result = await client.getEmployees();
        break;
      case 'lead_sources':
        result = await client.getLeadSources();
        break;
      case 'lead_source_categories':
        result = await client.getLeadSourceCategories();
        break;
      case 'locations':
        result = await client.getLocations();
        break;
      case 'loss_reasons':
        result = await client.getLossReasons();
        break;
      case 'custom_fields':
        result = await client.getCustomFields();
        break;
      case 'pipelines':
        result = await client.getPipelines();
        break;
      case 'pipeline_stages': {
        if (!ctx.input.pipelineId) {
          throw new Error('pipelineId is required when dataType is "pipeline_stages"');
        }
        result = await client.getPipelineStages(ctx.input.pipelineId);
        break;
      }
      case 'service_categories':
        result = await client.getServiceCategories();
        break;
      case 'service_priorities':
        result = await client.getServicePriorities();
        break;
      case 'service_resolutions':
        result = await client.getServiceResolutions();
        break;
      case 'assign_groups':
        result = await client.getAssignGroups();
        break;
      case 'csrs':
        result = await client.getCsrs();
        break;
      case 'business_classifications': {
        let params: Record<string, any> = {};
        if (ctx.input.searchQuery) params.search = ctx.input.searchQuery;
        result = await client.getBusinessClassifications(params);
        break;
      }
      case 'life_professionals':
        result = await client.getLifeProfessionals();
        break;
      default:
        throw new Error(`Unsupported dataType: ${ctx.input.dataType}`);
    }

    let items = Array.isArray(result) ? result : (result?.data ?? result?.items ?? [result]);

    return {
      output: {
        items
      },
      message: `Retrieved **${items.length}** ${label} item(s).`
    };
  })
  .build();
