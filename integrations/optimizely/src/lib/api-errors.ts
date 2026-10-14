import { buildApiServiceError } from 'slates';

// CMS problem details and ODP invalids are not preserved by the generic message extractor.
export let optimizelyErrorMapping = {
  mapAxiosError: (error: unknown) => {
    throw buildApiServiceError(error, {
      providerLabel: 'Optimizely',
      reason: 'optimizely_api_error',
      detailKeys: [
        'message',
        'detail',
        'title',
        'error',
        'error_description',
        'reason',
        'field',
        'code'
      ],
      nestedKeys: ['detail', 'invalids', 'errors']
    });
  }
};
