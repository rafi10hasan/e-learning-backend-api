import slugify from "slugify";

import { BadRequestError } from "../../errors/request/apiError";
import { ISubject } from "./subject.interface";
import Subject from "./subject.model";
import { TGetSubjectQueryPayload } from "./subject.zod";


const createSubject = async (payload: ISubject) => {
    const isExist = await Subject.findOne({
        name: { $regex: new RegExp(`^${payload.name}$`, 'i') },
        examType: payload.examType,
    });

    if (isExist) {
        throw new BadRequestError(
            `The subject name "${payload.name}" already exists for ${payload.examType}!`
        );
    }
    const generatedSlug = slugify(payload.name, { lower: true, strict: true });

    const subjectData = {
        ...payload,
        slug: generatedSlug,
    };

    const result = await Subject.create(subjectData);
    return {
        subjectId: result._id,
        name: result.name,
        slug: result.slug,
        examType: result.examType
    };
};


const getAllSubjects = async (query: TGetSubjectQueryPayload) => {
    const filter: Record<string, unknown> = { isActive: true };

    if (query?.examType) {
        filter.examType = query.examType;
    }

    const result = await Subject.find(filter).sort({ createdAt: -1 });

    const formattedResult = result.map(subject => ({
        subjectId: subject._id,
        name: subject.name,
        slug: subject.slug,
    }));

    return formattedResult;
};

export const subjectService = {
    createSubject,
    getAllSubjects,
};