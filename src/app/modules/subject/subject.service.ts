import slugify from "slugify";

import { TExamTypes } from "../../../interfaces";
import { EXAM_TYPES } from "../../../interfaces/index";
import { BadRequestError } from "../../errors/request/apiError";
import Department from "../department/department.model";
import Faculty from "../faculty/faculty.model";
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
        subjects: result._id,
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
        subjects: subject._id,
        name: subject.name,
        slug: subject.slug,
    }));

    return formattedResult;
};

const getSubjectsByExamType = async (plan: TExamTypes, facultyName: string) => {

    if (plan === EXAM_TYPES.MATURA || plan === EXAM_TYPES.SEMI_MATURA) {
        const subjects = await Subject.find({ examType: plan, isActive: true });
        return subjects.map(subject => ({
            subjectId: subject._id,
            name: subject.name,
            slug: subject.slug,
        }));
    }
    else if (plan === EXAM_TYPES.ENTRANCE_EXAM) {
        const faculty = await Faculty.findOne({ name: facultyName, examType: plan, isActive: true });
        const departments = await Department.find({ facultyId: faculty?._id, examType: plan, isActive: true });
        return departments.map(department => ({
            departmentId: department._id,
            name: department.name,
            slug: department.slug,
        }));
    }

}




export const subjectService = {
    createSubject,
    getAllSubjects,
    getSubjectsByExamType
};