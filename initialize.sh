# Fetch latest clarifai proto files
npx degit clarifai/clarifai-nodejs-grpc/proto proto/

# Delete unnecessary files
rm proto/clarifai/api/service_processed.proto
find ./proto -type f ! -name '*.proto' -delete

# Fetch latest google proto files
npx degit gogo/protobuf/protobuf/google/ google/
npx degit googleapis/googleapis/google/api/ google/api/

protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts_proto --ts_out=./src/generated --proto_path=. $(find proto/clarifai -name '*.proto')
