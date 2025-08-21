import { Client } from "@grpc/grpc-js";
import {
  PostWorkflowResultsRequest,
  PostWorkflowResultsResponse,
  V2Client,
} from "./generated/proto/clarifai/api/service";
import { ChannelCredentials, Metadata } from "@grpc/grpc-js";

// const client = new Client(
//   "api.clarifai.com:443",
//   ChannelCredentials.createSsl(),
// );

const client = new V2Client(
  "api.clarifai.com:443",
  ChannelCredentials.createSsl(),
);

const request = PostWorkflowResultsRequest.fromPartial({
  userAppId: {
    appId: "test-ocr-workflow",
    userId: "dani-cfg",
  },
  workflowId: "General",
  inputs: [
    {
      id: "test-image",
      data: {
        image: {
          url: "https://samples.clarifai.com/celebrity.jpeg",
        },
      },
    },
  ],
});

const meta = new Metadata();
meta.set("authorization", `Key ${process.env.CLARIFAI_PAT}`);

// client.makeUnaryRequest(
//   "/clarifai.api.V2/PostWorkflowResults",
//   (req) => Buffer.from(PostWorkflowResultsRequest.encode(req).finish()),
//   PostWorkflowResultsResponse.decode,
//   request,
//   meta,
//   (error, response) => {
//     if (error) {
//       console.log("rendering error");
//       console.error("Error:", error);
//     } else {
//       console.log("Response:", response);
//     }
//   },
// );

client.postWorkflowResults(request, meta, (error, response) => {
  if (error) throw error;
  console.log(JSON.stringify(response));
});
