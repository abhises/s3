const AwsS3 = require("./services/s3config"); // Adjust path if needed
const ErrorHandler = require("./utils/ErrorHandler");

AwsS3.init(process.env.AWS_REGION || "us-east-1");

async function testCreateBucketInvalid() {
  console.log("🧪 Test: Create Bucket with INVALID input\n");

  try {
    await AwsS3.createBucket(""); // ❌ Invalid input
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear(); // Always clear after checking

    console.log("❌ Caught Error from createBucket:");
    console.log("Error message:", err.message);
    console.log("\n📦 ErrorHandler Collected Errors:");
    console.dir(errors, { depth: null });
  }
}

async function testCreateBucketValid() {
  console.log("\n🧪 Test: Create Bucket with VALID input\n");

  try {
    const result = await AwsS3.createBucket("nepta");

    if (result === null) {
      console.log("⚠️ Bucket creation failed (null result)");
      const errors = ErrorHandler.get_all_errors();
      console.log("📦 ErrorHandler Collected Errors:");
      console.dir(errors, { depth: null });
    } else {
      //   console.log("✅ Bucket created successfully.");
      null;
    }

    ErrorHandler.clear();
  } catch (err) {
    console.log("❌ Unexpected error:", err.message);
    const errors = ErrorHandler.get_all_errors();
    console.dir(errors, { depth: null });
    ErrorHandler.clear();
  }
}

async function testListBuckets() {
  console.log("\n🔍 Test: listBuckets()\n");

  const result = await AwsS3.listBuckets();

  if (result === null) {
    console.log("❌ listBuckets() failed.");
    const errors = ErrorHandler.get_all_errors();
    console.log("📦 ErrorHandler Errors:");
    console.dir(errors, { depth: null });
  } else {
    console.log(`✅ listBuckets() returned ${result.length} bucket(s):`);
    result.forEach((b) => console.log(`- ${b.Name}`));
  }

  ErrorHandler.clear();
}

async function testDoesBucketExist(bucketName) {
  console.log(`\n🔍 Test: doesBucketExist("${bucketName}")\n`);

  try {
    const exists = await AwsS3.doesBucketExist(bucketName);

    if (exists === null) {
      console.log(`❌ doesBucketExist("${bucketName}") returned null.`);
      const errors = ErrorHandler.get_all_errors();
      console.log("📦 ErrorHandler Errors:");
      console.dir(errors, { depth: null });
    } else {
      console.log(`✅ Bucket "${bucketName}" exists: ${exists}`);
    }
  } catch (err) {
    console.log(`❌ Exception in doesBucketExist: ${err.message}`);
    const errors = ErrorHandler.get_all_errors();
    console.log("📦 ErrorHandler Errors:");
    console.dir(errors, { depth: null });
  }

  ErrorHandler.clear();
}

async function testDeleteBucket() {
  console.log("\n🧪 Test: deleteBucket (INVALID)");

  try {
    await AwsS3.deleteBucket(""); // ❌ invalid input
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    console.log("❌ Error:", err.message);
    console.log("📦 Collected Errors:", errors);
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: deleteBucket (VALID but may not exist)");

  const result = await AwsS3.deleteBucket("non-existent-bucket-test");
  if (result === null) {
    console.log("⚠️ Bucket deletion failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log("✅ Bucket deleted");
  }
  ErrorHandler.clear();
}

// 🧪 Upload File (valid)
async function testUploadFile() {
  console.log("\n🧪 Test: uploadFile");

  const bucket = "your-test-bucket"; // replace with a real bucket
  const key = "sample.txt";
  const content = Buffer.from("This is a test file");

  try {
    const result = await AwsS3.uploadFile(bucket, key, content, "text/plain");

    if (result === null) {
      console.log("⚠️ Upload failed");
      console.dir(ErrorHandler.get_all_errors(), { depth: null });
    } else {
      console.log("✅ File uploaded successfully.");
    }
  } catch (err) {
    console.log("❌ Unexpected Error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  }

  ErrorHandler.clear();
}

// 🧪 Check File Existence
async function testDoesFileExist() {
  console.log("\n🧪 Test: doesFileExist");

  const bucket = "your-test-bucket"; // same as above
  const key = "sample.txt";

  try {
    const exists = await AwsS3.doesFileExist(bucket, key);

    if (exists === null) {
      console.log("❌ Error checking file existence.");
      console.dir(ErrorHandler.get_all_errors(), { depth: null });
    } else {
      console.log(`✅ File exists: ${exists}`);
    }
  } catch (err) {
    console.log("❌ Error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  }

  ErrorHandler.clear();
}

async function testDeleteFile() {
  console.log("\n🧪 Test: deleteFile (INVALID input)");

  try {
    await AwsS3.deleteFile("", "some-key");
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: deleteFile (VALID input but may not exist)");
  const result = await AwsS3.deleteFile("your-bucket", "nonexistent-key.txt");
  if (result === null) {
    console.log("⚠️ deleteFile failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log("✅ deleteFile success");
  }
  ErrorHandler.clear();
}

// --- Test deleteFiles ---
async function testDeleteFiles() {
  console.log("\n🧪 Test: deleteFiles with EMPTY keys array");

  try {
    await AwsS3.deleteFiles("your-bucket", []); // This should throw
  } catch (err) {
    console.log("❌ Expected error for empty keys array:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }
}
// --- Test listFiles ---
async function testListFiles() {
  console.log("\n🧪 Test: listFiles (INVALID input)");

  try {
    await AwsS3.listFiles(""); // invalid bucket
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: listFiles (VALID input)");
  const files = await AwsS3.listFiles("your-bucket", "some-prefix/");
  if (files === null) {
    console.log("⚠️ listFiles failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log(`✅ listFiles returned ${files.length} files`);
    files.forEach((f) => console.log("-", f.Key));
  }
  ErrorHandler.clear();
}

async function testGetFile() {
  console.log("\n🧪 Test: getFile (INVALID input)");
  try {
    await AwsS3.getFile("", "");
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: getFile (VALID input)");
  const body = await AwsS3.getFile("your-bucket", "your-key.txt");
  if (body === null) {
    console.log("⚠️ getFile failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log("✅ getFile success: received data stream/body");
  }
  ErrorHandler.clear();
}

// --- Test copyFile ---
async function testCopyFile() {
  console.log("\n🧪 Test: copyFile (INVALID input)");
  try {
    await AwsS3.copyFile("", "", "", "");
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: copyFile (VALID input)");
  const result = await AwsS3.copyFile(
    "source-bucket",
    "source-key.txt",
    "dest-bucket",
    "dest-key.txt"
  );
  if (result === null) {
    console.log("⚠️ copyFile failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log("✅ copyFile success");
  }
  ErrorHandler.clear();
}

// --- Test initiateMultipartUpload ---
async function testInitiateMultipartUpload() {
  console.log("\n🧪 Test: initiateMultipartUpload (INVALID input)");
  try {
    await AwsS3.initiateMultipartUpload("", "");
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  console.log("\n🧪 Test: initiateMultipartUpload (VALID input)");
  const uploadId = await AwsS3.initiateMultipartUpload(
    "your-bucket",
    "bigfile.bin"
  );
  if (!uploadId) {
    console.log("⚠️ initiateMultipartUpload failed");
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
  } else {
    console.log(`✅ initiateMultipartUpload success: UploadId = ${uploadId}`);
  }
  ErrorHandler.clear();
}

async function testUploadPart() {
  console.log("\n🧪 Test: uploadPart");

  // Test invalid input (missing required param)
  try {
    await AwsS3.uploadPart("", "key", "uploadId", 1, "body");
  } catch (err) {
    console.log("❌ Expected error for invalid bucket:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test valid input (assuming AwsS3.client is initialized)
  try {
    const res = await AwsS3.uploadPart(
      "my-bucket",
      "my-key",
      "valid-upload-id",
      1,
      Buffer.from("test body")
    );
    console.log("✅ uploadPart result:", res);
  } catch (err) {
    console.log("❌ Unexpected error in uploadPart:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }
}

async function testCompleteMultipartUpload() {
  console.log("\n🧪 Test: completeMultipartUpload");

  // Test invalid input
  try {
    await AwsS3.completeMultipartUpload("", "key", "uploadId", []);
  } catch (err) {
    console.log("❌ Expected error for invalid bucket:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test valid input
  try {
    await AwsS3.completeMultipartUpload(
      "my-bucket",
      "my-key",
      "valid-upload-id",
      [{ ETag: '"etag1"', PartNumber: 1 }]
    );
    console.log("✅ completeMultipartUpload succeeded");
  } catch (err) {
    console.log("❌ Unexpected error in completeMultipartUpload:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }
}

async function testAbortMultipartUpload() {
  console.log("\n🧪 Test: abortMultipartUpload");

  // Test invalid input
  try {
    await AwsS3.abortMultipartUpload("", "key", "uploadId");
  } catch (err) {
    console.log("❌ Expected error for invalid bucket:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test valid input
  try {
    await AwsS3.abortMultipartUpload("my-bucket", "my-key", "valid-upload-id");
    console.log("✅ abortMultipartUpload succeeded");
  } catch (err) {
    console.log("❌ Unexpected error in abortMultipartUpload:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }
}

async function testGetPresignedUrl() {
  console.log("\n🧪 Test: getPresignedUrl");

  // Test invalid input
  try {
    await AwsS3.getPresignedUrl("", "key");
  } catch (err) {
    console.log("❌ Expected error for invalid bucket:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test unsupported operation
  try {
    await AwsS3.getPresignedUrl("my-bucket", "my-key", "deleteObject");
  } catch (err) {
    console.log("❌ Expected error for unsupported operation:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test valid input (getObject)
  try {
    const url = await AwsS3.getPresignedUrl("my-bucket", "my-key");
    console.log("✅ getPresignedUrl (getObject) URL:", url);
  } catch (err) {
    console.log("❌ Unexpected error in getPresignedUrl:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }

  // Test valid input (putObject)
  try {
    const url = await AwsS3.getPresignedUrl(
      "my-bucket",
      "my-key",
      "putObject",
      300
    );
    console.log("✅ getPresignedUrl (putObject) URL:", url);
  } catch (err) {
    console.log("❌ Unexpected error in getPresignedUrl:", err.message);
    console.dir(ErrorHandler.get_all_errors(), { depth: null });
    ErrorHandler.clear();
  }
}

// 🚀 Run tests
(async () => {
  await testCreateBucketInvalid();
  await testCreateBucketValid(); // replace with real bucket name if needed
  await testListBuckets();
  await testDoesBucketExist("nepta"); // Adjust based on actual buckets
  await testDoesBucketExist(""); // Intentional failure case
  await testDeleteBucket();
  await testUploadFile();
  await testDoesFileExist();
  await testDeleteFile();
  await testDeleteFiles();
  await testListFiles();
  await testGetFile();
  await testCopyFile();
  await testInitiateMultipartUpload();
  await testUploadPart();
  await testCompleteMultipartUpload();
  await testAbortMultipartUpload();
  await testGetPresignedUrl();
})();
