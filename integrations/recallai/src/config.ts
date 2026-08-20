import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us-west-2', 'us-east-1', 'eu-central-1', 'ap-northeast-1'])
        .describe('The AWS region associated with your Recall.ai account'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
