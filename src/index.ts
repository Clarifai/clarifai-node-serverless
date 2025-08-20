import {
  PostWorkflowResultsRequest,
  V2Client,
} from "./generated/proto/clarifai/api/service";
import { ChannelCredentials, Metadata } from "@grpc/grpc-js";

const client = new V2Client(
  "https://api.clarifai.com",
  ChannelCredentials.createSsl(),
);

const request: PostWorkflowResultsRequest = {
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
};
const meta = new Metadata();

meta.set("authorization", "Key key-here");

client.postWorkflowResults(request, meta, (error, response) => {
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Response:", response);
  }
});
