import slugify from "slugify";

import { Types } from "mongoose";
import { TExamTypes, USER_LANGUAGES } from "../../../interfaces";
import { EXAM_TYPES } from "../../../interfaces/index";
import { BadRequestError } from "../../errors/request/apiError";
import Department from "../department/department.model";
import Faculty from "../faculty/faculty.model";
import { ISubject } from "./subject.interface";
import Subject from "./subject.model";
import { TGetSubjectQueryPayload } from "./subject.zod";
import { IUser } from "../user/user.interface";


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

const getSubjectsOrDepartmentsByExamType = async (user:IUser) => {

    if (user.plan === EXAM_TYPES.MATURA || user.plan === EXAM_TYPES.SEMI_MATURA) {
        const subjects = await Subject.find({ examType: user.plan, isActive: true });
        return subjects.map(subject => ({
            subjectId: subject._id,
            name: user.language === USER_LANGUAGES.ENGLISH ? subject.nameInEnglish : subject.nameInAlbanian,
            slug: subject.slug,
            isElective: subject.isElective
        }));
    }
    else if (user.plan === EXAM_TYPES.ENTRANCE_EXAM) {
        const faculty = await Faculty.findOne({ name: user.faculty, examType: user.plan, isActive: true });
        const departments = await Department.find({ facultyId: faculty?._id, examType: user.plan, isActive: true });
        return departments.map(department => ({
            departmentId: department._id,
            name: department.name,
            slug: department.slug,
        }));
    }

}


const getSubjectsByDepartments = async (user: IUser,departments: Types.ObjectId[]) => {

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
                        name: user.language === USER_LANGUAGES.ENGLISH ? subject.nameInEnglish : subject.nameInAlbanian,
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