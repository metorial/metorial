import { createApiServiceError } from 'slates';
import { record, type SensiboRecord } from './client';

export let validateAcState = (
  state: SensiboRecord,
  device: SensiboRecord,
  complete = false
) => {
  if (!Object.values(state).some(value => value !== undefined)) {
    throw createApiServiceError('Provide at least one AC state property.');
  }
  if (
    complete &&
    ['on', 'mode', 'fanLevel', 'targetTemperature'].some(key => state[key] === undefined)
  ) {
    throw createApiServiceError(
      'Provide on, mode, fanLevel, and targetTemperature for the scheduled AC state.'
    );
  }
  if (state.targetTemperature !== undefined && !Number.isInteger(state.targetTemperature)) {
    throw createApiServiceError(
      'targetTemperature must be a whole number in the selected temperature unit.'
    );
  }
  let capabilities = record(device.remoteCapabilities, 'device remote capabilities');
  let modes = record(capabilities.modes, 'supported AC modes');
  let selectedMode = state.mode ?? device.acState?.mode;
  if (selectedMode !== undefined && !Object.hasOwn(modes, selectedMode)) {
    throw createApiServiceError(
      'The selected AC mode is not supported by this device. Use get_device to inspect capabilities.'
    );
  }
  let mode =
    selectedMode === undefined
      ? undefined
      : record(modes[selectedMode], 'AC mode capabilities');
  for (let [property, values] of Object.entries({
    fanLevel: mode?.fanLevels,
    swing: mode?.swing,
    horizontalSwing: mode?.horizontalSwing,
    light: mode?.light
  })) {
    if (
      state[property] !== undefined &&
      Array.isArray(values) &&
      !values.includes(state[property])
    ) {
      throw createApiServiceError(
        `The selected ${property} is not supported by this device and mode. Use get_device to inspect capabilities.`
      );
    }
  }
  if (state.targetTemperature !== undefined) {
    let unit =
      state.temperatureUnit ?? device.acState?.temperatureUnit ?? device.temperatureUnit;
    if (unit === undefined)
      throw createApiServiceError(
        'Provide temperatureUnit when the device does not report its current unit.'
      );
    let values = mode?.temperatures?.[unit]?.values;
    if (Array.isArray(values) && !values.includes(state.targetTemperature)) {
      throw createApiServiceError(
        'The target temperature is not supported by this device, mode, and temperature unit. Use get_device to inspect capabilities.'
      );
    }
  }
};

export let stateResult = (result: unknown): SensiboRecord => {
  let value = record(
    Array.isArray(result) && result.length === 1 ? result[0] : result,
    'AC state response'
  );
  let state = record(value.acState ?? value, 'AC state');
  if (
    ![
      'on',
      'mode',
      'targetTemperature',
      'temperatureUnit',
      'fanLevel',
      'swing',
      'horizontalSwing',
      'light'
    ].some(key => Object.hasOwn(state, key))
  ) {
    throw createApiServiceError(
      'Sensibo returned an AC state response without any state properties.'
    );
  }
  return state;
};
