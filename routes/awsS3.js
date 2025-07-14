const express = require("express");
const multer = require("multer");
const AwsS3 = require("../services/s3config");
const ErrorHandler = require("../utils/ErrorHandler");

const router = express.Router();
const upload = multer(); // memory storage

// Set AWS region (do this once before any call)
AwsS3.init(process.env.AWS_REGION || "us-east-1");

// Upload file
router.post("/bucket", async (req, res) => {
  try {
    const { bucket } = req.body || {};
    const result = await AwsS3.createBucket(bucket);

    // Check for errors recorded by ErrorHandler
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear(); // 🔄 Always clear after handling
      return res.status(400).json({
        success: false,
        message: "Bucket creation failed",
        errors,
      });
    }

    // No errors, respond with success
    return res.json({
      success: true,
      message: "Bucket created",
      result,
    });
  } catch (err) {
    // 🧼 Handle unexpected exceptions
    const errors = ErrorHandler.get_all_errors();
    console.log("error in creating bucket", errors);
    ErrorHandler.clear();
    console.error("Caught unexpected error:", err.message);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ List all buckets
router.get("/buckets", async (req, res) => {
  try {
    const buckets = await AwsS3.listBuckets();

    // Check for any errors that were collected
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear(); // clear after handling
      return res.status(400).json({
        success: false,
        message: "Failed to list buckets",
        errors,
      });
    }

    // Return success with buckets
    return res.json({
      success: true,
      message: "Buckets fetched successfully",
      buckets,
    });
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();
    console.error("Caught unexpected error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Check if bucket exists
router.get("/bucket/exists", async (req, res) => {
  try {
    const { bucket } = req.query;

    const exists = await AwsS3.doesBucketExist(bucket);

    // Check for errors recorded by ErrorHandler
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();
      return res.status(400).json({
        success: false,
        message: "Bucket existence check failed",
        errors,
      });
    }

    return res.json({
      success: true,
      message: `Bucket ${exists ? "exists" : "does not exist"}`,
      exists,
    });
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    console.log(errors);
    ErrorHandler.clear();
    console.error("Caught unexpected error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Delete a bucket
router.delete("/bucket", async (req, res) => {
  try {
    const { bucket } = req.body;
    const result = await AwsS3.deleteBucket(bucket);
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();
      return res.status(400).json({
        success: false,
        message: "Bucket deletion failed",
        errors,
      });
    }

    return res.json({
      success: true,
      message: "Bucket deleted",
      result,
    });
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Upload file
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { bucket, key } = req.body;
    const file = req.file;

    // Let AwsS3.uploadFile handle validation and error collection
    const result = await AwsS3.uploadFile(
      bucket,
      key,
      file?.buffer,
      file?.mimetype
    );
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear(); // 🔄 Always clear after handling
      return res.status(400).json({
        success: false,
        message: "Upload failed",
        errors,
      });
    }

    // If no internal error, return success
    return res.json({
      success: true,
      message: "File uploaded successfully",
      result,
    });
  } catch (err) {
    // 🧼 Handle unexpected exceptions
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();
    console.error("Caught unexpected error:", err.message);
    return res.status(500).json({
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Check if a file (object) exists in the bucket
router.get("/file/exists", async (req, res) => {
  try {
    const { bucket, key } = req.query;

    // 🔴 Manual validation + ErrorHandler
    if (!bucket || !key) {
      ErrorHandler.add_error("bucket and key are required", {
        bucket,
        key,
      });

      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();

      return res.status(400).json({
        success: false,
        message: "Missing required query parameters",
        errors,
      });
    }

    // ✅ Call the function
    const exists = await AwsS3.doesFileExist(bucket, key);

    // 🔍 If doesFileExist failed internally
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();

      return res.status(400).json({
        success: false,
        message: "File existence check failed",
        errors,
      });
    }

    // 🎯 Success
    return res.json({
      success: true,
      exists,
    });
  } catch (err) {
    // 💥 Unexpected runtime error
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();

    console.error("Caught error in doesFileExist route:", err.message);

    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Get/Download file from S3
router.get("/file", async (req, res) => {
  try {
    const { bucket, key } = req.query;

    // 🔴 Validate query parameters

    // ✅ Check file existence via getFile (but not stream it)
    const fileStream = await AwsS3.getFile(bucket, key);

    if (!fileStream) {
      const errors = ErrorHandler.get_all_errors();
      console.log(errors);

      ErrorHandler.clear();
      console.log(errors);

      return res.status(404).json({
        success: false,
        // message: "File not found or unreadable",
        errors,
      });
    }
    // 🎯 File exists, return a success response (no download/streaming here)
    ErrorHandler.clear();

    return res.status(200).json({
      success: true,
      message: `File "${key}" found in bucket "${bucket}"`,
    });
  } catch (err) {
    // 💥 Unexpected exception
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();

    console.error("Caught error in /file route:", errors);

    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred",
      error: errors,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Delete a file
router.delete("/file", async (req, res) => {
  try {
    const { bucket, key } = req.body;
    if (!bucket || !key) {
      return res.status(400).json({ error: "bucket and key are required" });
    }

    const result = await AwsS3.deleteFile(bucket, key);

    if (result === null) {
      // The deleteFile method failed but did NOT throw.
      // Option 1: Retrieve the last error from ErrorHandler if you have such method
      const lastError = ErrorHandler.get_all_errors(); // hypothetical method
      return res.status(500).json({
        error: "Failed to delete file",
        details: lastError || null,
      });
    }

    // Success
    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    // Catch any unexpected errors
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete multiple files
router.delete("/files", async (req, res) => {
  try {
    const { bucket, keys } = req.body;

    // Call core S3 deletion method
    const result = await AwsS3.deleteFiles(bucket, keys);

    if (result === null) {
      // Collect errors from ErrorHandler
      const errors = ErrorHandler.get_all_errors();

      console.error("🛑 ErrorHandler errors from deleteFiles:", errors);

      return res.status(500).json({
        error: "Failed to delete files",
        details: errors,
      });
    }

    // Success
    res.json({ success: true, message: "Files deleted successfully" });

    // Optionally clear error handler after success
    ErrorHandler.clear();
  } catch (err) {
    // Catch unexpected internal errors
    console.error("🔥 Unexpected router-level error:", err);

    return res.status(500).json({
      error: "Unexpected server error",
      details: [{ message: err.message }],
    });
  }
});

// ✅ List files with optional prefix
router.get("/files", async (req, res) => {
  try {
    const { bucket, prefix = "" } = req.query;
    if (!bucket) return res.status(400).json({ error: "bucket is required" });

    const files = await AwsS3.listFiles(bucket, prefix);
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Copy file
// ✅ Copy file from one bucket/key to another
router.post("/file/copy", async (req, res) => {
  try {
    const { sourceBucket, sourceKey, destBucket, destKey } = req.body;

    // 🔴 Manual validation + ErrorHandler

    // ✅ Attempt to copy the file
    await AwsS3.copyFile(sourceBucket, sourceKey, destBucket, destKey);

    // 🔍 If copyFile added internal errors
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();

      return res.status(500).json({
        success: false,
        message: "Failed to copy file",
        errors,
      });
    }

    // 🎯 Success
    return res.json({
      success: true,
      message: `File copied from "${sourceBucket}/${sourceKey}" to "${destBucket}/${destKey}"`,
    });
  } catch (err) {
    // 💥 Unexpected runtime error
    const errors = ErrorHandler.get_all_errors();
    console.log("erros", errors);
    ErrorHandler.clear();

    console.error("Caught error in file copy route:", err.message);

    return res.status(500).json({
      success: false,
      message: errors.message,
      error: errors,
      details: errors.length ? errors : errors,
    });
  }
});

router.post("/multipart/initiate", async (req, res) => {
  const { bucket, key } = req.body;

  if (!bucket || !key) {
    return res.status(400).json({ error: "bucket and key are required" });
  }

  try {
    const uploadId = await AwsS3.initiateMultipartUpload(bucket, key);
    res.json({ uploadId });
  } catch (err) {
    console.error("Error initiating multipart upload:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/multipart/upload-part", async (req, res) => {
  const { bucket, key, uploadId, partNumber, bodyBase64 } = req.body;

  if (!bucket || !key || !uploadId || !partNumber || !bodyBase64) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Convert base64 body to Buffer for binary upload
    const bodyBuffer = Buffer.from(bodyBase64, "base64");

    const result = await AwsS3.uploadPart(
      bucket,
      key,
      uploadId,
      partNumber,
      bodyBuffer
    );
    res.json(result); // { ETag, PartNumber }
  } catch (err) {
    console.error("Error uploading part:", err);
    res.status(500).json({ error: err.message });
  }
});

// Complete Multipart Upload
router.post("/multipart/complete", async (req, res) => {
  try {
    const { bucket, key, uploadId, parts } = req.body;

    if (!bucket || !key || !uploadId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({
        success: false,
        message: "bucket, key, uploadId and parts array are required",
      });
    }

    // Keep calling the method as-is
    await AwsS3.completeMultipartUpload(bucket, key, uploadId, parts);

    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();
      return res.status(400).json({
        success: false,
        message: "Failed to complete multipart upload",
        errors,
      });
    }

    return res.json({
      success: true,
      message: "Multipart upload completed successfully",
    });
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();
    return res.status(500).json({
      success: false,
      message: err.message || "Unexpected error",
      errors: errors.length ? errors : undefined,
    });
  }
});

// Abort Multipart Upload

router.post("/multipart/abort", async (req, res) => {
  try {
    const { bucket, key, uploadId } = req.body;

    // Call the abort method which includes internal validation and logging
    await AwsS3.abortMultipartUpload(bucket, key, uploadId);

    // Check if any errors were collected during abort
    if (ErrorHandler.has_errors()) {
      const errors = ErrorHandler.get_all_errors();
      ErrorHandler.clear();
      return res.status(500).json({
        success: false,
        message: "Failed to abort multipart upload",
        errors,
      });
    }

    return res.json({
      success: true,
      message: `Multipart upload aborted for "${bucket}/${key}"`,
    });
  } catch (err) {
    const errors = ErrorHandler.get_all_errors();
    ErrorHandler.clear();

    console.error("Caught error in abort route:", err.message);

    return res.status(500).json({
      success: false,
      message: "Unexpected error occurred during abort",
      error: err.message,
      details: errors.length ? errors : undefined,
    });
  }
});

// ✅ Generate presigned URL
router.get("/presign", async (req, res) => {
  try {
    const { bucket, key, op = "getObject" } = req.query;
    if (!bucket || !key)
      return res.status(400).json({ error: "bucket and key are required" });

    const url = await AwsS3.getPresignedUrl(bucket, key, op);
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
