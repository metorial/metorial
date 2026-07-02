import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'yandex',
  name: 'Yandex',
  description:
    'Yandex Cloud integration for managing compute instances, object storage, serverless functions, DNS, VPC, IAM, container registries, translation, and logging.',
  metadata: {},
  config,
  auth
});
