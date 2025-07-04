import express from "express";
import multer from "multer";
import AwsS3 from "../services/s3config.js";

const router = express.Router();
const upload = multer(); // memory storage

// Set AWS region (do this once before any call)
AwsS3.init(process.env.AWS_REGION || "us-east-1");

// Upload file
router.post("/bucket", async (req, res) => {
  try {
    const { bucket } = req.body;
    if (!bucket) return res.status(400).json({ error: "bucket is required" });

    await AwsS3.createBucket(bucket);
    res.json({ success: true, message: "Bucket created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Check if bucket exists
router.get("/bucket/exists", async (req, res) => {
  try {
    const { bucket } = req.query;
    if (!bucket) {
      return res.status(400).json({ error: "bucket is required" });
    }

    const exists = await AwsS3.doesBucketExist(bucket);
    res.json({ success: true, exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Check if a file (object) exists in the bucket
router.get("/file/exists", async (req, res) => {
  try {
    const { bucket, key } = req.query;

    if (!bucket || !key) {
      return res
        .status(400)
        .json({ error: "Both 'bucket' and 'key' are required" });
    }

    const exists = await AwsS3.doesFileExist(bucket, key);
    res.json({ success: true, exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get/Download file from S3
router.get("/file", async (req, res) => {
  const { bucket, key } = req.query;

  if (!bucket || !key) {
    return res
      .status(400)
      .json({ error: "Both 'bucket' and 'key' are required." });
  }

  try {
    const s3Res = await AwsS3.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );

    res.setHeader(
      "Content-Type",
      s3Res.ContentType || "application/octet-stream"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${key}"`);

    s3Res.Body.pipe(res); // stream the file to client
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete a bucket
router.delete("/bucket", async (req, res) => {
  try {
    const { bucket } = req.body;
    if (!bucket) return res.status(400).json({ error: "bucket is required" });

    await AwsS3.deleteBucket(bucket);
    res.json({ success: true, message: "Bucket deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ List all buckets
router.get("/buckets", async (req, res) => {
  try {
    const buckets = await AwsS3.listBuckets();
    res.json({ success: true, buckets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Upload file
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { bucket, key } = req.body;
    const file = req.file;

    if (!bucket || !key || !file) {
      return res
        .status(400)
        .json({ error: "bucket, key, and file are required" });
    }

    await AwsS3.uploadFile(bucket, key, file.buffer, file.mimetype);
    res.json({ success: true, message: "File uploaded successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete a file
router.delete("/file", async (req, res) => {
  try {
    const { bucket, key } = req.body;
    if (!bucket || !key)
      return res.status(400).json({ error: "bucket and key are required" });

    await AwsS3.deleteFile(bucket, key);
    res.json({ success: true, message: "File deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete multiple files
router.delete("/files", async (req, res) => {
  try {
    const { bucket, keys } = req.body;
    if (!bucket || !Array.isArray(keys) || keys.length === 0)
      return res
        .status(400)
        .json({ error: "bucket and keys (array) are required" });

    await AwsS3.deleteFiles(bucket, keys);
    res.json({ success: true, message: "Files deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ✅ Copy file
// ✅ Copy file from one bucket/key to another
router.post("/file/copy", async (req, res) => {
  const { sourceBucket, sourceKey, destBucket, destKey } = req.body;

  if (!sourceBucket || !sourceKey || !destBucket || !destKey) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await AwsS3.copyFile(sourceBucket, sourceKey, destBucket, destKey);
    res.json({ message: "File copied successfully." });
  } catch (err) {
    console.error("Error copying file:", err);
    res.status(500).json({ error: err.message });
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
  const { bucket, key, uploadId, parts } = req.body;

  if (!bucket || !key || !uploadId || !parts || !Array.isArray(parts)) {
    return res
      .status(400)
      .json({ error: "bucket, key, uploadId and parts array are required" });
  }

  try {
    await AwsS3.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts }, // parts = [{ETag: "...", PartNumber: 1}, ...]
      })
    );
    AwsS3.cache.objects.set(`${bucket}/${key}`, true);
    res.json({ message: "Multipart upload completed successfully." });
  } catch (err) {
    console.error("Error completing multipart upload:", err);
    res.status(500).json({ error: err.message });
  }
});

// Abort Multipart Upload
router.post("/multipart/abort", async (req, res) => {
  const { bucket, key, uploadId } = req.body;

  if (!bucket || !key || !uploadId) {
    return res
      .status(400)
      .json({ error: "bucket, key and uploadId are required" });
  }

  try {
    await AwsS3.client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
    res.json({ message: "Multipart upload aborted successfully." });
  } catch (err) {
    console.error("Error aborting multipart upload:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
