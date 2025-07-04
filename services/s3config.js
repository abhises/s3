import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteBucketCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListObjectsV2Command,
  ListBucketsCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand, // <-- add this line
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
dotenv.config();

export default class AwsS3 {
  static client = null;

  static cache = {
    buckets: new Map(), // bucketName => exists: true/false
    objects: new Map(), // `${bucket}/${key}` => exists: true/false
  };

  static init(region = process.env.S3_REGION) {
    if (!AwsS3.client) {
      console.log("Initializing AWS S3 client with region", region);
      console.log("AccessKey:", process.env.S3_ACCESS_KEY ? "****" : "missing");
      AwsS3.client = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
      });
    }
  }

  static async createBucket(bucket) {
    await AwsS3.client.send(new CreateBucketCommand({ Bucket: bucket }));
    AwsS3.cache.buckets.set(bucket, true);
  }

  static async doesBucketExist(bucket) {
    if (AwsS3.cache.buckets.has(bucket)) {
      return AwsS3.cache.buckets.get(bucket);
    }

    try {
      await AwsS3.client.send(new HeadBucketCommand({ Bucket: bucket }));
      AwsS3.cache.buckets.set(bucket, true);
      return true;
    } catch (err) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        AwsS3.cache.buckets.set(bucket, false);
        return false;
      }
      throw err;
    }
  }

  static async deleteBucket(bucket) {
    await AwsS3.client.send(new DeleteBucketCommand({ Bucket: bucket }));
    AwsS3.cache.buckets.delete(bucket);
  }

  static async listBuckets() {
    const res = await AwsS3.client.send(new ListBucketsCommand());
    res.Buckets?.forEach((b) => AwsS3.cache.buckets.set(b.Name, true));
    return res.Buckets || [];
  }

  static async uploadFile(
    bucket,
    key,
    body,
    contentType = "application/octet-stream"
  ) {
    await AwsS3.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    AwsS3.cache.objects.set(`${bucket}/${key}`, true);
  }

  static async doesFileExist(bucket, key) {
    const objKey = `${bucket}/${key}`;
    if (AwsS3.cache.objects.has(objKey)) {
      return AwsS3.cache.objects.get(objKey);
    }

    try {
      await AwsS3.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
      AwsS3.cache.objects.set(objKey, true);
      return true;
    } catch (err) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        AwsS3.cache.objects.set(objKey, false);
        return false;
      }
      throw err;
    }
  }

  static async deleteFile(bucket, key) {
    await AwsS3.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
    AwsS3.cache.objects.delete(`${bucket}/${key}`);
  }

  static async deleteFiles(bucket, keys = []) {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("keys must be a non-empty array");
    }

    const objects = keys.map((key) => ({ Key: key }));

    await AwsS3.client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: objects },
      })
    );

    keys.forEach((k) => AwsS3.cache.objects.delete(`${bucket}/${k}`));
  }

  static async listFiles(bucket, prefix = "") {
    const res = await AwsS3.client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      })
    );
    return res.Contents || [];
  }

  static async getFile(bucket, key) {
    const res = await AwsS3.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return res.Body;
  }

  static async copyFile(sourceBucket, sourceKey, destBucket, destKey) {
    await AwsS3.client.send(
      new CopyObjectCommand({
        CopySource: `${sourceBucket}/${sourceKey}`,
        Bucket: destBucket,
        Key: destKey,
      })
    );
    AwsS3.cache.objects.set(`${destBucket}/${destKey}`, true);
  }

  static async initiateMultipartUpload(bucket, key) {
    const res = await AwsS3.client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return res.UploadId;
  }

  static async uploadPart(bucket, key, uploadId, partNumber, body) {
    const res = await AwsS3.client.send(
      new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      })
    );
    return { ETag: res.ETag, PartNumber: partNumber };
  }

  static async completeMultipartUpload(bucket, key, uploadId, parts) {
    await AwsS3.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      })
    );
    AwsS3.cache.objects.set(`${bucket}/${key}`, true);
  }

  static async abortMultipartUpload(bucket, key, uploadId) {
    await AwsS3.client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );
  }

  static async getPresignedUrl(
    bucket,
    key,
    operation = "getObject",
    expiresInSeconds = 900
  ) {
    let command;
    switch (operation) {
      case "getObject":
        command = new GetObjectCommand({ Bucket: bucket, Key: key });
        break;
      case "putObject":
        command = new PutObjectCommand({ Bucket: bucket, Key: key });
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return await getSignedUrl(AwsS3.client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
