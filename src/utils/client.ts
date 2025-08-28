import { V2Client } from "../generated/proto/clarifai/api/service";
import { ChannelCredentials } from "@grpc/grpc-js";

const MAX_MESSAGE_LENGTH = 1024 * 1024 * 1024; // 1GB
const requestOptions = {
  "grpc.max_receive_message_length": MAX_MESSAGE_LENGTH,
  "grpc.max_send_message_length": MAX_MESSAGE_LENGTH,
};

export const getClient = (base?: string) => {
  return new V2Client(
    base || "api.clarifai.com:443",
    ChannelCredentials.createSsl(),
    requestOptions,
  );
};
