// S3 configuration for file uploads
// Requires @aws-sdk/client-s3 to be installed when AWS_S3_BUCKET is set
// Falls back gracefully when the SDK is not installed

const s3Config = {
  bucket: process.env.AWS_S3_BUCKET || '',
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
};

export const isS3Enabled = !!(s3Config.bucket && s3Config.accessKeyId && s3Config.secretAccessKey);

// eslint-disable-next-line @typescript-eslint/no-var-requires
let s3Client: any = null;
let S3Initialized = false;

function getS3Client(): any {
  if (S3Initialized) return s3Client;
  S3Initialized = true;

  if (!isS3Enabled) return null;

  try {
    // Use require() to avoid TypeScript compilation errors when @aws-sdk/client-s3 is not installed
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
    console.log('S3 client initialized for bucket:', s3Config.bucket);
  } catch {
    console.warn('AWS SDK not installed. S3 uploads disabled. Run: npm install @aws-sdk/client-s3');
  }

  return s3Client;
}

export async function uploadToS3(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
  const client = getS3Client();
  if (!client || !s3Config.bucket) throw new Error('S3 not configured');

  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  await client.send(new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  }));
  return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
}

export { s3Client, s3Config };
