import struct_pb from "google-protobuf/google/protobuf/struct_pb.js";
import {
  Data,
  ModelTypeField,
  Part,
} from "../generated/proto/clarifai/api/resources";
const { Struct } = struct_pb;

export const setPartDataTypes = (
  data: Data,
  value: struct_pb.Value.AsObject,
  fieldType?: number,
) => {
  const stringVal = value.stringValue;
  const numVal = value.numberValue;
  if (numVal) {
    if (fieldType === 4) {
      data.floatValue = Number(numVal);
    } else if (fieldType === 3) {
      data.intValue = Number(numVal);
    }
  }
  if (stringVal) {
    if (fieldType === 4) {
      data.floatValue = Number(stringVal);
    } else if (fieldType === 3) {
      data.intValue = Number(stringVal);
    } else {
      data.stringValue = stringVal;
    }
  }
  data.boolValue = value.boolValue;
};

export const constructPartsFromParams = (
  params: Record<string, any>,
  modelParamSpecs?: ModelTypeField[],
) => {
  const paramsStruct = Struct.fromJavaScript(params).toObject();
  const newParts = Object.entries(paramsStruct.fieldsMap).map(
    ([, [fieldName, fieldValue]]) => {
      const part: Part = {} as Part;
      const data: Data = {} as Data;
      part.data = data;
      part.id = fieldName;

      const fieldType = modelParamSpecs?.find(
        (spec) => spec.name === fieldName,
      )?.type;

      // unknown type conversion needed since the enum gives the index number in API
      setPartDataTypes(data, fieldValue, fieldType as unknown as number);
      return part;
    },
  );
  return newParts;
};
