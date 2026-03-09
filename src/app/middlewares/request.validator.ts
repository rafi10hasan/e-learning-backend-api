import { NextFunction, Request, RequestHandler, Response } from 'express';
import z, { ZodError } from 'zod';
import asyncHandler from '../../shared/asynchandler';

import { handleZodError } from '../errors/validation/validationError';

//validate request
export const validateRequest = (schemas: { 
  body?: z.ZodType<any>; 
  query?: z.ZodType<any>; 
  params?: z.ZodType<any> 
}): RequestHandler => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        
        req.body = await schemas.body.parseAsync(req.body);
       
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        
        const formattedError = handleZodError(err);
        res.status(formattedError.statusCode).json(formattedError);
        return; 
      }

      next(err);
    }
  });
};
/*

userRouter.patch(
  '/:id',
  validateRequest({
    body: updateUserSchema,
    query: querySchema,
    params: paramsSchema,
  }),
  updateUserHandler
);

*/

// Form Data Request

export const validateFormDataRequest = (schema: z.ZodType<any>) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      let payload: any = {};
  
      if (req.body?.data) {
        // Handle potential parsing errors for the JSON string
        try {
          payload = JSON.parse(req.body.data);
        } catch (e) {
          payload = {};
        }
      } else {
        payload = req.body || {};
      }

      req.body = await schema.parseAsync(payload);
      next();
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json(handleZodError(err));
      }

      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Invalid form-data payload',
      });
    }
  });
};

// export const validateFormDataRequest = (schema: z.ZodType<any>) => {
//   return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       if (!req.body.data) {
//         return res.status(400).json({
//           statusCode: StatusCodes.BAD_REQUEST,
//           status: 'failed',
//           success: false,
//           message:`${process.env.NODE_ENV === 'development' ? "Missing `data` field in form-data!'" : 'invalid form data request'}`
//         });
//       }

//       const jsonData = JSON.parse(req.body.data);
//       req.body = await schema.parseAsync(jsonData);

//       next();
//     } catch (err: any) {
//       if (err instanceof ZodError) {
//         const zodErrorResponse = handleZodError(err);
//         return res.status(400).json(zodErrorResponse);
//       }

//       return sendResponse(res, {
//         statusCode: StatusCodes.BAD_REQUEST,
//         status: 'failed',
//         success: false,
//         message: 'Invalid form-data payload',
//       });
//     }
//   });
// };
