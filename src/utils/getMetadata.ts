import { Metadata } from "@grpc/grpc-js";

export const getMetaData = (pat: string) => {
  const meta = new Metadata();
  meta.set("authorization", `Key ${pat}`);
  return meta;
};
