import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bolt-iot',
  name: 'Bolt Iot',
  description:
    'IoT platform for controlling Bolt WiFi modules — manage GPIO pins, analog sensors, servo motors, and UART communication remotely via the Bolt Cloud.',
  metadata: {},
  config,
  auth
});
