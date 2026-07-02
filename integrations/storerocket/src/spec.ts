import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'storerocket',
  name: 'StoreRocket',
  description:
    'Store locator software that enables businesses to add customizable, embeddable location finders to their websites. Access account information, manage users, and query store locations with addresses, hours, and contact details.',
  metadata: {},
  config,
  auth
});
