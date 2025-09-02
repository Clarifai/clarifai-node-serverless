import { V2Client } from "../generated/proto/clarifai/api/service";
import { ChannelCredentials } from "@grpc/grpc-js";

export const getClient = (base?: string) => {
  return new V2Client(
    base || "api.clarifai.com:443",
    ChannelCredentials.createSsl(),
  );
};
