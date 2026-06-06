import { StatusCodes } from "http-status-codes";
import asyncHandler from "../../../shared/asynchandler";
import sendResponse from "../../../shared/sendResponse";
import { passageService } from "./passage.service";
import { Request, Response } from "express";
import { PassageFiles } from "./passage.interface";



const createPassage = asyncHandler(async (req: Request, res: Response) => {
  const result = await passageService.createPassage(req.body, req.files as PassageFiles);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Passage created successfully.",
    data: result,
  });
});

export const passageController = {
    createPassage
}