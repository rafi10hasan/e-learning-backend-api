import slugify from "slugify";

import { BadRequestError } from "../../errors/request/apiError";

import Faculty from "./faculty.model";
import { TCreateFacultyPayload } from "./faculty.zod";


const createFaculty = async (payload: TCreateFacultyPayload) => {
    const isExist = await Faculty.findOne({
        name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
    });

    if (isExist) {
        throw new BadRequestError(
            `The faculty name "${payload.name}" already exists `
        );
    }
    const generatedSlug = slugify(payload.name, { lower: true, strict: true });

    const facultyData = {
        ...payload,
        slug: generatedSlug,
    };

    const result = await Faculty.create(facultyData);
    return {
        facultyId: result._id,
        name: result.name,
        slug: result.slug,
    };
};


const getAllFaculties = async () => {

    const result = await Faculty.find({}).lean();
    const formattedResult = result.map(faculty => ({
        facultyId: faculty._id,
        name: faculty.name,
        slug: faculty.slug,
    }));

    return formattedResult;
};

export const facultyService = {
    createFaculty,
    getAllFaculties,
};