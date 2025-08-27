import { v4 as uuid } from "uuid";
import { Input } from "./generated/proto/clarifai/api/resources";

export const getInputFromUrl = ({
  id,
  url,
  inputType,
}: {
  id?: string;
  url: string;
  inputType: "image" | "text" | "video" | "audio";
}) => {
  // @ts-expect-error - Optional keys are not well defined
  const data: Input["data"] =
    inputType === "image"
      ? {
          image: {
            url,
          },
        }
      : inputType === "text"
        ? {
            text: {
              url,
            },
          }
        : inputType === "video"
          ? {
              video: {
                url,
              },
            }
          : inputType === "audio"
            ? {
                audio: {
                  url,
                },
              }
            : {};

  // @ts-expect-error - Optional keys are not well defined
  const input: Input = {
    id: id || uuid(),
    data,
  };

  return input;
};

export const getInputFromBytes = ({
  id,
  inputBytes,
  inputType,
}: {
  id?: string;
  inputBytes: Buffer;
  inputType: "image" | "text" | "video" | "audio";
}) => {
  // @ts-expect-error - Optional keys are not well defined
  const data: Input["data"] =
    inputType === "image"
      ? {
          image: {
            base64: inputBytes,
          },
        }
      : inputType === "text"
        ? {
            text: {
              raw: inputBytes,
            },
          }
        : inputType === "video"
          ? {
              video: {
                base64: inputBytes,
              },
            }
          : inputType === "audio"
            ? {
                audio: {
                  base64: inputBytes,
                },
              }
            : {};

  // @ts-expect-error - Optional keys are not well defined
  const input: Input = {
    id: id || uuid(),
    data,
  };

  return input;
};
