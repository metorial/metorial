import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-s3',
  name: 'Amazon S3',
  description:
    'Store, retrieve, and manage objects in Amazon S3 buckets. Upload and download files, create and configure buckets, generate presigned URLs, manage object versions, tags, and access controls.',
  metadata: {},
  config,
  auth
});
