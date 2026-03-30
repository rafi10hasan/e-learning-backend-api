import slugify from "slugify";

import { BadRequestError } from "../../errors/request/apiError";
import Faculty from "../faculty/faculty.model";
import Department from "./department.model";
import { TCreateDepartmentPayload } from "./department.zod";
import mongoose from "mongoose";


const createDepartmentUnderFaculty = async (payload: TCreateDepartmentPayload, facultyId: string) => {

    const isFacultyExist = await Faculty.findOne({ _id: facultyId });
    if (!isFacultyExist) {
        throw new BadRequestError("Faculty not found");
    }

    const isExist = await Department.findOne({
        name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
        facultyId,
    });

    if (isExist) {
        throw new BadRequestError(
            `The department name "${payload.name}" already exists `
        );
    }
    const generatedSlug = slugify(payload.name, { lower: true, strict: true });

    const departmentData = {
        ...payload,
        slug: generatedSlug,
        facultyId,
    };

    const result = await Department.create(departmentData);
    return {
        departmentId: result._id,
        name: result.name,
        slug: result.slug,
        facultyId: result.facultyId,
    };
};


const getAllDepartmentByFacultyId = async (facultyId: string) => {
   console.log(facultyId)
    const result = await Department.find({ facultyId: new mongoose.Types.ObjectId(facultyId) });
    console.log({result})
    const formattedResult = result.map(department => ({
        departmentId: department._id,
        name: department.name,
        slug: department.slug,
        facultyId: department.facultyId,
    }));

    return formattedResult;
};

export const departmentService = {
    createDepartmentUnderFaculty,
    getAllDepartmentByFacultyId,
};