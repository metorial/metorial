import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gagelist',
  name: 'GageList',
  description:
    'Cloud-based calibration management software for tracking gages, calibration records, and compliance with quality standards.',
  metadata: {},
  config,
  auth
});
