import { Request } from 'express';
import { UploadedFile } from 'express-fileupload';

declare global {
  namespace Express {
    interface Request {
      files?: {
        [key: string]: UploadedFile | UploadedFile[];
      };
    }
  }
}

declare module 'express-fileupload' {
  interface UploadedFile {
    name: string;
    data: Buffer;
    size: number;
    encoding: string;
    tempFilePath: string;
    truncated: boolean;
    mimetype: string;
    md5: string;
    mv(path: string, callback?: (err?: any) => void): Promise<void>;
  }
}