// test/awsS3.test.js
const AwsS3 = require("./services/s3config");
const ErrorHandler = require("./utils/ErrorHandler");

AwsS3.init(process.env.AWS_REGION || "us-east-1");

// --- Test: createBucket with INVALID input ---
async function testCreateBucketInvalid() {
  console.log("\n🧪 Test: createBucket with INVALID input\n");

  try {
    await AwsS3.createBucket(""); // Invalid input
  } catch (err) {
    console.log("❌ Expected error:", err.message);
    console.log("📦 ErrorHandler Errors:", ErrorHandler.get_all_errors());
    ErrorHandler.clear();
  }
}

// --- Test: createBucket with VALID input ---
async function testCreateBucketValid() {
  console.log("\n🧪 Test: createBucket with VALID input\n");

  try {
    const result = await AwsS3.createBucket("nepta-test-bucket");
    if (result === null) {
      console.log("⚠️ Bucket creation returned null");
    } else {
      console.log("✅ Bucket created successfully");
    }
  } catch (err) {
    console.log("❌ Unexpected error:", err.message);
  } finally {
    ErrorHandler.clear();
  }
}

// --- Test: listBuckets ---
async function testListBuckets() {
  console.log("\n🔍 Test: listBuckets\n");

  const result = await AwsS3.listBuckets();
  if (result === null) {
    console.log("❌ listBuckets failed");
    console.dir(ErrorHandler.get_all_errors());
  } else {
    console.log(`✅ ${result.length} buckets found:`);
    result.forEach((b) => console.log("-", b.Name));
  }
  ErrorHandler.clear();
}

// --- Test: doesBucketExist ---
async function testDoesBucketExist(bucketName) {
  console.log(`\n🔍 Test: doesBucketExist(\"${bucketName}\")\n`);

  try {
    const exists = await AwsS3.doesBucketExist(bucketName);
    console.log(`✅ Bucket exists: ${exists}`);
  } catch (err) {
    console.log("❌ Error:", err.message);
  } finally {
    ErrorHandler.clear();
  }
}

// Entry point to run all tests
(async () => {
  await testCreateBucketInvalid();
  await testCreateBucketValid();
  await testListBuckets();
  await testDoesBucketExist("nepta-test-bucket");
  await testDoesBucketExist(""); // Intentionally invalid
})();
