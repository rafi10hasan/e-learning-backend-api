import { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { MAX_FILE_COUNTS } from '../../helpers/fileuploader';

export const multerErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      const field = err.field || 'unknown';

      const maxAllowed = MAX_FILE_COUNTS[field];
      console.log(maxAllowed)
      if (maxAllowed) {
        res.status(400).json({
              status: 'failed',
          success: false,
          message: `You can upload a maximum of ${maxAllowed} file(s) for '${field}'.`,
        });
        return;
      }

      res.status(400).json({
        status: 'failed',
        success: false,
        message: `Invalid field name: ${err.field}`,
      });
      return;
    }
    return;
  }

  if (err instanceof Error) {
    res.status(400).json({
      status: 'failed',
      success: false,
      message: err.message,
    });
    return;
  }

  next(err);
};
