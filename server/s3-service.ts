import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import path from 'path';
import { Readable } from 'stream';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const bucketName = process.env.S3_BUCKET_NAME || '';

if (!bucketName) {
  console.error('S3_BUCKET_NAME environment variable is not set');
}

/**
 * Upload a file to S3 bucket
 * @param fileBuffer - Buffer of the file
 * @param fileName - Original file name
 * @param clientId - ID of the client for folder structure
 * @returns URL of the uploaded file
 */
export async function uploadToS3(fileBuffer: Buffer, fileName: string, clientId: number): Promise<string> {
  // Generate a unique file name to avoid collisions
  const fileExtension = path.extname(fileName);
  const uniqueFileName = `${clientId}/${Date.now()}${fileExtension}`;
  
  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: Readable.from(fileBuffer),
      ContentType: getContentType(fileExtension)
    };

    const upload = new Upload({
      client: s3Client,
      params: uploadParams
    });

    await upload.done();
    
    // Return the URL to access the file
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw error;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(fileExtension: string): string {
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  return contentTypes[fileExtension.toLowerCase()] || 'application/octet-stream';
}