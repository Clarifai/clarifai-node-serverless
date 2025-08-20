# Fetch latest clarifai proto files
npx degit --force clarifai/clarifai-nodejs-grpc/proto proto/

# Fetch latest google proto files
npx degit --force gogo/protobuf/protobuf/google/ google/
npx degit --force googleapis/googleapis/google/api/ google/api/

# Delete unnecessary files
rm proto/clarifai/api/service_processed.proto
find ./proto -type f ! -name '*.proto' -delete
find ./proto -type d -empty -delete

protoc \
  --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts_proto \
  --ts_out=grpc-js,outputServices=grpc-js:./src/generated \
  --proto_path=. \
  $(find proto/clarifai -name '*.proto')
