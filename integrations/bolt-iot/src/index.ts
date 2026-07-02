import { Slate } from 'slates';
import { spec } from './spec';
import {
  analogRead,
  analogWrite,
  digitalRead,
  digitalWrite,
  getDeviceStatus,
  listDevices,
  restartDevice,
  servoControl,
  uartCommunicate
} from './tools';
import { analogSensorReading, deviceStatusChange, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listDevices,
    getDeviceStatus,
    restartDevice,
    digitalWrite,
    digitalRead,
    analogRead,
    analogWrite,
    servoControl,
    uartCommunicate
  ],
  triggers: [inboundWebhook, deviceStatusChange, analogSensorReading]
});
