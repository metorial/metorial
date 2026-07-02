import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let metadataTypeEnum = z.enum([
  'profiles',
  'groups',
  'tags',
  'users',
  'teams',
  'topics',
  'queues'
]);

export let getMetadata = SlateTool.create(spec, {
  name: 'Get Metadata',
  key: 'get_metadata',
  description: `Retrieve account metadata from Sprout Social including connected social profiles, groups, tags (labels and campaigns), users, teams, listening topics, and case queues. This data is essential for obtaining IDs needed by other operations (e.g., **customer_profile_id** values for analytics queries, **group_id** for messages, **topic_id** for listening).`,
  instructions: [
    'Use "profiles" to get connected social network profiles and their customer_profile_id values.',
    'Use "groups" to get group IDs needed for message queries and publishing.',
    'Use "tags" to get tag IDs for filtering messages or tagging posts.',
    'Use "topics" to get listening topic IDs for social listening queries.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: metadataTypeEnum.describe('The type of metadata to retrieve.')
    })
  )
  .output(
    z.object({
      resources: z.array(z.any()).describe('Array of metadata resources returned by the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let result: any;
    switch (ctx.input.resourceType) {
      case 'profiles':
        result = await client.getCustomerProfiles();
        break;
      case 'groups':
        result = await client.getGroups();
        break;
      case 'tags':
        result = await client.getTags();
        break;
      case 'users':
        result = await client.getUsers();
        break;
      case 'teams':
        result = await client.getTeams();
        break;
      case 'topics':
        result = await client.getTopics();
        break;
      case 'queues':
        result = await client.getQueues();
        break;
    }

    let resources = result?.data ?? [];

    return {
      output: { resources },
      message: `Retrieved **${resources.length}** ${ctx.input.resourceType} from Sprout Social.`
    };
  });
