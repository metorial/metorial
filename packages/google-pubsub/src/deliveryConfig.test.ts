// Push authentication: https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions
// Gmail publisher: https://developers.google.com/workspace/gmail/api/guides/push#grant_publish_rights_on_your_topic
// Forms publisher: https://developers.google.com/workspace/forms/api/guides/push-notifications
// Meet publisher: https://developers.google.com/workspace/events/guides/create-subscription
// Cloud Storage service agent: https://cloud.google.com/storage/docs/getting-service-agent
import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { googlePubSubDeliveryConfig } from './deliveryConfig';
import { googlePubSubDeliveryConfigSchema } from './deliveryConfigSchema';

let webhookUrl = 'https://delivery.example/receive/key';
let input = {
  topicName: 'projects/delivery-project/topics/gmail-events',
  subscriptionName: 'projects/delivery-project/subscriptions/gmail-events',
  pushServiceAccountEmail: 'push@delivery-project.iam.gserviceaccount.com'
};
let saved = {
  projectId: 'delivery-project',
  ...input,
  audience: webhookUrl
};

let finish = (userWebhookRegistrationPayload: unknown, url = webhookUrl) =>
  googlePubSubDeliveryConfig('gmail').finish({
    input: {
      webhookUrl: url,
      partialWebhookRegistrationPayload: {},
      userWebhookRegistrationPayload
    }
  } as Parameters<ReturnType<typeof googlePubSubDeliveryConfig>['finish']>[0]);

let setup = async (product: Parameters<typeof googlePubSubDeliveryConfig>[0]) =>
  googlePubSubDeliveryConfig(product).setup({
    input: { webhookUrl }
  } as Parameters<ReturnType<typeof googlePubSubDeliveryConfig>['setup']>[0]);

let rejection = (message: string) =>
  expect.objectContaining({ data: expect.objectContaining({ message, status: 400 }) });

describe('delivery config schemas', () => {
  it('describes the three values a person enters with labels and help text', () => {
    let schema = z.toJSONSchema(googlePubSubDeliveryConfig('gmail').userConfigSchema);
    expect(schema).toMatchObject({
      type: 'object',
      required: ['topicName', 'subscriptionName', 'pushServiceAccountEmail']
    });
    expect(Object.keys(schema.properties!)).toEqual(schema.required);
    for (let property of Object.values(schema.properties!)) {
      expect(property).toMatchObject({
        type: 'string',
        title: expect.stringMatching(/\S/),
        description: expect.stringMatching(/\S/)
      });
    }
  });

  it('saves the Pub/Sub resources and audience as the delivery config', () => {
    expect(googlePubSubDeliveryConfig('gmail').fullConfigSchema).toBe(
      googlePubSubDeliveryConfigSchema
    );
    expect(googlePubSubDeliveryConfigSchema.parse(saved)).toEqual(saved);
    expect(z.toJSONSchema(googlePubSubDeliveryConfigSchema)).toMatchObject({
      required: [
        'projectId',
        'topicName',
        'subscriptionName',
        'pushServiceAccountEmail',
        'audience'
      ]
    });
    for (let invalid of [
      { ...saved, audience: '' },
      { topicName: saved.topicName },
      { ...saved, projectId: 'other-project' }
    ]) {
      expect(googlePubSubDeliveryConfigSchema.safeParse(invalid).success).toBe(false);
    }
  });
});

describe('delivery config finish', () => {
  it('builds the saved payload with the project of the topic and the endpoint as audience', async () => {
    expect(await finish(input)).toEqual({ webhookRegistrationPayload: saved });
  });

  it('ignores surrounding whitespace and unknown values', async () => {
    expect(
      await finish({
        ...Object.fromEntries(
          Object.entries(input).map(([key, value]) => [key, ` ${value}\n`])
        ),
        audience: 'https://attacker.example',
        projectId: 'other',
        oauthClientId: '1234567890-abc123.apps.googleusercontent.com'
      })
    ).toEqual({ webhookRegistrationPayload: saved });
  });

  // Push tokens carry the service account email in lower case and it is compared exactly.
  it('saves the push service account in lower case', async () => {
    let result = await finish({
      ...input,
      pushServiceAccountEmail: 'Push@Delivery-Project.iam.gserviceaccount.com'
    });
    expect(result.webhookRegistrationPayload).toEqual(saved);
  });

  it.each([
    ['topicName', undefined, 'Topic name must look like'],
    [
      'topicName',
      'gmail-events',
      'Topic name must look like projects/<project>/topics/<name>.'
    ],
    ['topicName', input.subscriptionName, 'Topic name must look like'],
    ['topicName', 42, 'Topic name must look like'],
    [
      'subscriptionName',
      'gmail-events',
      'Subscription name must look like projects/<project>/subscriptions/<name>.'
    ],
    [
      'subscriptionName',
      `${input.subscriptionName}/extra`,
      'Subscription name must look like'
    ],
    [
      'pushServiceAccountEmail',
      'person@example.com',
      'Push service account must be a service account email ending with .gserviceaccount.com.'
    ],
    ['pushServiceAccountEmail', '', 'Push service account must be'],
    [
      'pushServiceAccountEmail',
      'a..b@p.iam.gserviceaccount.com',
      'Push service account must be'
    ]
  ])('rejects %s %j by naming the field', async (key, value, message) => {
    let failure = await finish({ ...input, [key]: value }).catch(error => error);
    expect(failure).toBeInstanceOf(ServiceError);
    expect(failure).toEqual(rejection(expect.stringContaining(message)));
  });

  it('rejects a topic and subscription in different projects', async () => {
    await expect(
      finish({
        ...input,
        subscriptionName: 'projects/other-project/subscriptions/gmail-events'
      })
    ).rejects.toEqual(
      rejection('Topic and subscription must be in the same Google Cloud project.')
    );
  });

  it('rejects missing input and an endpoint that is not HTTPS', async () => {
    for (let missing of [undefined, null, 'text', []]) {
      await expect(finish(missing)).rejects.toEqual(
        rejection('Enter the topic name, subscription name, and push service account.')
      );
    }
    await expect(finish(input, 'http://delivery.example/receive/key')).rejects.toEqual(
      rejection('The delivery endpoint must be an HTTPS URL.')
    );
  });
});

describe('delivery config setup', () => {
  let publishers = {
    gmail: 'gmail-api-push@system.gserviceaccount.com',
    forms: 'forms-notifications@system.gserviceaccount.com',
    meet: 'meet-api-event-push@system.gserviceaccount.com',
    storage: 'service-<project number>@gs-project-accounts.iam.gserviceaccount.com'
  } as const;
  let products = Object.keys(publishers) as (keyof typeof publishers)[];
  let codeBlock = (text: string) => `\n\n   \`\`\`\n   ${text}\n   \`\`\`\n\n`;

  it.each(
    Object.entries(publishers) as [keyof typeof publishers, string][]
  )('tells a person how to deliver %s events', async (product, publisher) => {
    let result = await setup(product);
    let document = result.webhookSetupDocument;

    expect(result.partialWebhookRegistrationPayload).toEqual({});
    expect(document).toContain(codeBlock(webhookUrl));
    expect(document).toContain(codeBlock(publisher));
    for (let other of Object.values(publishers)) {
      if (other !== publisher) expect(document).not.toContain(other);
    }
    expect(document).toContain('Pub/Sub Publisher');
    expect(document).toContain('rejects deliveries until you save this setup');
    expect(document).not.toMatch(/slates|runtime|hub|binding|registration/i);
    expect(document).toContain('open the project that owns your OAuth app');
    expect(document).not.toMatch(/client ID/i);
  });

  // A column-0 line that is not a numbered step ends the list and breaks the numbering.
  it.each(
    products
  )('renders the %s steps as one consecutively numbered list', async product => {
    let lines = (await setup(product)).webhookSetupDocument.split('\n');
    let steps = lines.flatMap((line, index) => (/^\d/.test(line) ? [index] : []));
    let numbers = steps.map(index => lines[index]!.match(/^(\d+)\. \S/)?.[1]);

    expect(numbers).toEqual(['1', '2', '3', '4', '5']);
    expect(lines.join('\n').match(/\d+\. /g)).toHaveLength(numbers.length);

    let end = lines.indexOf('', steps.at(-1)!);
    let list = lines.slice(steps[0]!, end);
    for (let line of list) {
      if (line !== '') expect(line).toMatch(/^(\d+\. | {3}\S)/);
    }

    let fences = lines.flatMap((line, index) => (line.includes('```') ? [index] : []));
    expect(fences.length).toBeGreaterThan(0);
    expect(fences.length % 2).toBe(0);
    for (let index = 0; index < fences.length; index += 2) {
      let [open, close] = [fences[index]!, fences[index + 1]!];
      expect(open).toBeGreaterThan(steps[0]!);
      expect(close).toBeLessThan(end);
      for (let line of lines.slice(open, close + 1)) expect(line).toMatch(/^ {3}\S/);
    }
  });

  it.each(
    products
  )('grants push authentication before the %s subscription step', async product => {
    let document = (await setup(product)).webhookSetupDocument;
    let subscription = document.indexOf('**Pub/Sub > Subscriptions**');
    expect(subscription).toBeGreaterThan(-1);
    for (let role of ['**Service Account User**', '**Service Account Token Creator**']) {
      expect(document.indexOf(role)).toBeGreaterThan(-1);
      expect(document.indexOf(role)).toBeLessThan(subscription);
    }
  });

  it.each(
    products
  )('ends the %s steps with the three fields in the order of the form', async product => {
    let config = googlePubSubDeliveryConfig(product);
    let document = (await setup(product)).webhookSetupDocument;
    let finalStep = document.slice(document.search(/^5\. /m)).split('\n\n')[0]!;
    let labels = [...finalStep.matchAll(/^ {3}- \*\*(.+?)\*\*/gm)].map(match => match[1]);

    expect(labels).toEqual(['Topic name', 'Subscription name', 'Push service account']);
    expect(labels).toEqual(
      Object.values(z.toJSONSchema(config.userConfigSchema).properties!).map(
        property => (property as { title?: string }).title
      )
    );
  });

  it('explains how to find the Cloud Storage service agent of each bucket project', async () => {
    let document = (await setup('storage')).webhookSetupDocument;
    expect(document).toContain('every project whose buckets should send events');
    expect(document).toContain('**Cloud Storage > Settings**');
    expect(document).toContain('gcloud storage service-agent --project=<project>');
  });
});
