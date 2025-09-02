import struct_pb from "google-protobuf/google/protobuf/struct_pb.js";
import { setPartDataTypes } from "./setPartsFromParams";
import {
  Audio,
  Concept,
  Data,
  Frame,
  Image,
  ModelTypeField,
  ModelTypeField_DataType,
  Part,
  Region,
  Video,
} from "../generated/proto/clarifai/api/resources";
const { Struct } = struct_pb;

export const constructPartsFromPayload = (
  payload: Record<string, any> | any[],
  modelPayloadSpecs?: ModelTypeField[],
) => {
  const partsList: Part[] = [];

  if (Array.isArray(payload)) {
    payload.forEach((nestedPayload) => {
      const part: Part = {} as Part;
      const data: Data = {} as Data;
      part.data = data;

      let updatedPayloadValue = nestedPayload;
      if (typeof nestedPayload === "object") {
        updatedPayloadValue = JSON.stringify(nestedPayload);
      }

      const fieldValueStruct = Struct.fromJavaScript({
        value: updatedPayloadValue,
      }).toObject();

      const [, valueObject] = fieldValueStruct.fieldsMap.find((_, index) => {
        return index === 0;
      }) ?? [undefined, undefined];

      if (valueObject) {
        setPartDataTypes(
          data,
          valueObject,
          modelPayloadSpecs?.[0]?.type as unknown as number,
        );
      }

      partsList.push(part);
    });
    return partsList;
  }

  Object.entries(payload).forEach(([fieldName, fieldValue]) => {
    const specs = modelPayloadSpecs?.find((each) => each.name === fieldName);
    const fieldType = specs?.type;
    const part: Part = {} as Part;
    const data: Data = {} as Data;
    part.data = data;
    part.id = fieldName;

    let nestedPartsList: Part[] | undefined = undefined;

    if (specs?.typeArgs?.length) {
      nestedPartsList = constructPartsFromPayload(
        fieldValue as any,
        specs.typeArgs,
      );
    }

    if (nestedPartsList) {
      nestedPartsList.forEach((nestedPart) => {
        if (data.parts.length) data.parts.push(nestedPart);
        else data.parts = [nestedPart];
      });
    }

    let updatedFieldValue = fieldValue;

    if (typeof fieldValue === "object" && fieldValue !== null) {
      if (fieldType === ModelTypeField_DataType.JSON_DATA) {
        updatedFieldValue = JSON.stringify(fieldValue);
      } else if (
        fieldType === ModelTypeField_DataType.IMAGE &&
        !Array.isArray(fieldValue)
      ) {
        const imageData = Image.fromPartial(fieldValue);
        data.image = imageData;
        partsList.push(part);
        return;
      } else if (fieldType === ModelTypeField_DataType.AUDIO) {
        const audioData = Audio.fromPartial(fieldValue);
        data.audio = audioData;
        partsList.push(part);
        return;
      } else if (fieldType === ModelTypeField_DataType.VIDEO) {
        const videoData = Video.fromPartial(fieldValue);
        data.video = videoData;
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.CONCEPT &&
        !Array.isArray(fieldValue)
      ) {
        const conceptData = Concept.fromPartial(fieldValue);
        data.concepts = [conceptData];
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.CONCEPT &&
        Array.isArray(fieldValue)
      ) {
        const conceptsList = fieldValue.map((each) => {
          return Concept.fromPartial(each);
        });
        data.concepts = conceptsList;
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.REGION &&
        !Array.isArray(fieldValue)
      ) {
        const regionData = Region.fromPartial(fieldValue);
        data.regions = [regionData];
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.REGION &&
        Array.isArray(fieldValue)
      ) {
        const regionsList = fieldValue.map((each) => {
          return Region.fromPartial(each);
        });
        data.regions = regionsList;
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.FRAME &&
        !Array.isArray(fieldValue)
      ) {
        const frameData = Frame.fromPartial(fieldValue);
        data.frames = [frameData];
        partsList.push(part);
        return;
      } else if (
        fieldType === ModelTypeField_DataType.FRAME &&
        Array.isArray(fieldValue)
      ) {
        const framesList = fieldValue.map((each) => {
          return Frame.fromPartial(each);
        });
        data.frames = framesList;
        partsList.push(part);
        return;
      } else if (!Array.isArray(fieldValue)) {
        // Unknown object just store it as string
        updatedFieldValue = JSON.stringify(fieldValue);
      }
    }

    const fieldValueStruct = Struct.fromJavaScript({
      value: updatedFieldValue,
    }).toObject();

    const [, valueObject] = fieldValueStruct.fieldsMap.find((_, index) => {
      return index === 0;
    }) ?? [undefined, undefined];

    if (valueObject) {
      setPartDataTypes(data, valueObject, fieldType as unknown as number);
    }
    partsList.push(part);
  });

  return partsList;
};
