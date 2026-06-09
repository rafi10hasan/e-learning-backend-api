import slugify from "slugify";

import { Types } from "mongoose";
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

const getSubjectsOrDepartmentsByExamType = async (plan: TExamTypes, facultyName: string) => {

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


const getSubjectsByDepartments = async (departments: Types.ObjectId[]) => {

    const departmentIds = departments.map(id => new Types.ObjectId(id));

    const subjects = await Department.find({ _id: { $in: departmentIds } }).populate('subjects');

    const result: { subjectId: Types.ObjectId; name: string; slug: string }[] = [];

    const seenSubjectIds = new Set<string>();

    subjects.forEach(department => {
        if (department.subjects && Array.isArray(department.subjects)) {
            department.subjects.forEach((subject: any) => {
                const subjectIdStr = subject._id.toString(); 

                if (!seenSubjectIds.has(subjectIdStr)) {
                    seenSubjectIds.add(subjectIdStr); 

                    result.push({
                        subjectId: subject._id,
                        name: subject.name,
                        slug: subject.slug
                    });
                }
            });
        }
    });

    return result;
};



export const subjectService = {
    createSubject,
    getAllSubjects,
    getSubjectsOrDepartmentsByExamType,
    getSubjectsByDepartments
};