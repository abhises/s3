import AWS from "aws-sdk";
import { parse } from "json2csv";

import dotenv from "dotenv";
dotenv.config();

export default class AwsTranslateManager {
  constructor(config = {}) {
    this.region = config.region || "us-east-1";
    this.bucket = config.bucket;
    this.jsonKey = config.jsonKey; // JSON array in S3
    this.csvKey = config.csvKey; // Target for AWS CSV
    this.customDictionaryName = config.customDictionaryName; // Terminology name
    this.iamRoleArn = config.iamRoleArn;
    this.defaultTargetLanguage = config.defaultTargetLanguage || "fr";

    AWS.config.update({
      region: this.region,
      accessKeyId: process.env.AWS_TRANSLATE_KEY,
      secretAccessKey: process.env.AWS_TRANSLATE_SECRET,
    });

    this._s3 = null;
    this._translate = null;

    this._dictionaryEntries = []; // Internal memory store
  }

  get s3() {
    if (!this._s3) this._s3 = new AWS.S3();
    return this._s3;
  }

  get translate() {
    if (!this._translate) this._translate = new AWS.Translate();
    return this._translate;
  }

  /** ========== 1. BASIC TRANSLATION ========== */

  async translateText(text, targetLang = this.defaultTargetLanguage) {
    const params = {
      Text: text,
      TargetLanguageCode: targetLang,
    };

    if (this.customDictionaryName) {
      params.TerminologyNames = [this.customDictionaryName]; // AWS-registered resource
    }

    const result = await this.translate.translateText(params).promise();
    return result.TranslatedText;
  }

  /** ========== 2. BULK TRANSLATION ========== */

  async startBulkTranslation(
    inputS3Uri,
    outputS3Uri,
    targetLangs = [this.defaultTargetLanguage]
  ) {
    if (!this.iamRoleArn) {
      throw new Error("IAM role ARN is required for bulk translation.");
    }

    const params = {
      JobName: `bulk-translate-${Date.now()}`,
      InputDataConfig: {
        S3Uri: inputS3Uri,
        ContentType: "application/json",
      },
      OutputDataConfig: {
        S3Uri: outputS3Uri,
      },
      DataAccessRoleArn: this.iamRoleArn,
      TargetLanguageCodes: targetLangs,
    };

    if (this.customDictionaryName) {
      params.TerminologyNames = [this.customDictionaryName];
    }

    const res = await this.translate.startTextTranslationJob(params).promise();
    return res.JobId;
  }

  /** ========== 3. CUSTOM DICTIONARY MANAGEMENT ========== */

  async loadCustomDictionaryJson() {
    const res = await this.s3
      .getObject({
        Bucket: this.bucket,
        Key: this.jsonKey,
      })
      .promise();

    this._dictionaryEntries = JSON.parse(res.Body.toString("utf-8"));
    return this._dictionaryEntries;
  }

  addOrUpdateDictionaryEntry(source, targetLang, translation) {
    const idx = this._dictionaryEntries.findIndex(
      (e) => e.source === source && e.language === targetLang
    );

    if (idx !== -1) {
      this._dictionaryEntries[idx].translation = translation;
    } else {
      this._dictionaryEntries.push({
        source,
        language: targetLang,
        translation,
      });
    }
  }

  deleteDictionaryEntry(source, targetLang) {
    this._dictionaryEntries = this._dictionaryEntries.filter(
      (e) => !(e.source === source && e.language === targetLang)
    );
  }

  async saveCustomDictionaryJson() {
    const body = JSON.stringify(this._dictionaryEntries, null, 2);
    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: this.jsonKey,
        Body: body,
        ContentType: "application/json",
      })
      .promise();
  }

  async convertJsonToAwsCsvAndUpload(targetLang = this.defaultTargetLanguage) {
    const rows = this._dictionaryEntries
      .filter((e) => e.language === targetLang)
      .map((e) => ({
        SourceText: e.source,
        [targetLang]: e.translation,
      }));

    const csv = parse(rows, { fields: ["SourceText", targetLang] });

    await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: this.csvKey,
        Body: csv,
        ContentType: "text/csv",
      })
      .promise();
  }

  async importDictionaryToAwsTranslate(
    targetLang = this.defaultTargetLanguage
  ) {
    const params = {
      Name: this.customDictionaryName,
      MergeStrategy: "OVERWRITE",
      Description: `Overrides for ${targetLang}`,
      TerminologyData: {
        File: Buffer.from(""), // placeholder per SDK
        Format: "CSV",
      },
      InputDataConfig: {
        S3Uri: `s3://${this.bucket}/${this.csvKey}`,
        ContentType: "text/csv",
      },
    };

    await this.translate.importTerminology(params).promise();
  }
}
