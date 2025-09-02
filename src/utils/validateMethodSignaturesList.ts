import { z } from "zod";
import {
  ModelTypeField,
  ModelTypeField_DataType,
} from "../generated/proto/clarifai/api/resources";

const typeValidators: Record<ModelTypeField_DataType, z.ZodTypeAny> = {
  [ModelTypeField_DataType.NOT_SET]: z.undefined().or(z.null()),
  [ModelTypeField_DataType.STR]: z.string(),
  [ModelTypeField_DataType.BYTES]: z.any(), // placeholder; customize per your bytes format
  [ModelTypeField_DataType.INT]: z.number().int(),
  [ModelTypeField_DataType.FLOAT]: z.number().refine((n) => {
    // Based on https://github.com/colinhacks/zod/discussions/2237#discussioncomment-5487432
    return (
      !z.number().int().safeParse(n).success &&
      z.number().finite().safeParse(n).success
    );
  }),
  [ModelTypeField_DataType.BOOL]: z.boolean(),
  [ModelTypeField_DataType.NDARRAY]: z.any(), // could add stricter shape if using ndarray lib
  [ModelTypeField_DataType.JSON_DATA]: z.record(z.any()),
  [ModelTypeField_DataType.TEXT]: z.string(),
  [ModelTypeField_DataType.IMAGE]: z.any(), // placeholder; customize per your image format
  [ModelTypeField_DataType.CONCEPT]: z.any(),
  [ModelTypeField_DataType.REGION]: z.any(),
  [ModelTypeField_DataType.FRAME]: z.any(),
  [ModelTypeField_DataType.AUDIO]: z.any(),
  [ModelTypeField_DataType.VIDEO]: z.any(),
  [ModelTypeField_DataType.NAMED_FIELDS]: z.record(z.any()),
  [ModelTypeField_DataType.TUPLE]: z.array(z.any()), // accepts any array
  [ModelTypeField_DataType.LIST]: z.array(z.any()),
  [ModelTypeField_DataType.UNRECOGNIZED]: z.any(),
};

export const validateMethodSignaturesList = (
  params: Record<string, unknown>,
  inputFieldsList: ModelTypeField[],
) => {
  const requiredFieldsList = inputFieldsList
    .filter((each) => each.required)
    .map((each) => each.name);
  const missingKeys = requiredFieldsList.filter((key) => !(key in params));
  if (missingKeys.length > 0) {
    throw new Error(`Missing required fields: ${missingKeys.join(", ")}`);
  }
  Object.entries(params).forEach(([key, value]) => {
    const field = inputFieldsList.find((field) => field.name === key);
    if (field) {
      const validator = typeValidators[field.type];
      if (validator) {
        const result = validator.safeParse(value);
        if (!result.success) {
          throw new Error(
            `Validation failed for field ${key}: ${result.error}`,
          );
        }
      } else {
        throw new Error(`No validator found for data type ${field.type}`);
      }
    } else {
      throw new Error(`Field ${key} not found in input fields list`);
    }
  });
};
