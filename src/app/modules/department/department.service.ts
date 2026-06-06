import slugify from "slugify";

import mongoose from "mongoose";
import { BadRequestError } from "../../errors/request/apiError";
import Faculty from "../faculty/faculty.model";
import Department from "./department.model";
import { TCreateDepartmentPayload } from "./department.zod";


const createDepartmentUnderFaculty = async (payload: TCreateDepartmentPayload, faculty: string) => {

    const isFacultyExist = await Faculty.findOne({ _id: faculty });
    if (!isFacultyExist) {
        throw new BadRequestError("Faculty not found");
    }

    const isExist = await Department.findOne({
        name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
        faculty,
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
        faculty,
    };

    const result = await Department.create(departmentData);
    return {
        departments: result._id,
        name: result.name,
        slug: result.slug,
        faculty: result.faculty,
    };
};


const getAllDepartmentByfaculty = async (faculty: string) => {
    console.log(faculty)
    const result = await Department.find({ facultyId: new mongoose.Types.ObjectId(faculty) });
    console.log({ result })
    const formattedResult = result.map(department => ({
        departments: department._id,
        name: department.name,
        slug: department.slug,
        faculty: department.faculty,
    }));

    return formattedResult;
};

export const departmentService = {
    createDepartmentUnderFaculty,
    getAllDepartmentByfaculty,
};