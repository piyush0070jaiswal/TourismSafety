import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import schema from '../../../schemas/json/telemetry.v1.json' assert { type: 'json' };

const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // adds date-time, uuid, etc.
const validateTelemetryFn = ajv.compile(schema as any) as ValidateFunction;

export function validateJson<T = unknown>(data: T, validate: ValidateFunction) {
  const ok = !!validate(data);
  const errors = ok ? undefined : (validate.errors as ErrorObject[] | undefined);
  return { ok, errors } as const;
}

export function validateTelemetry(data: unknown) {
  return validateJson(data, validateTelemetryFn);
}
