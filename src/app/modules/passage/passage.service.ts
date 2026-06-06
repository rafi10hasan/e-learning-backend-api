import { uploadToCloudinary } from "../../cloudinary/uploadImageToCLoudinary";
import { BadRequestError } from "../../errors/request/apiError";
import { PassageFiles } from "./passage.interface";
import Passage from "./passage.model";
import { TCreatePassagePayload } from "./passage.zod";

const createPassage = async (payload: TCreatePassagePayload
    , files: PassageFiles) => {
    // Create a passage record without linking questions here.

    let passageImageUrl: string | undefined;
    if (files?.passage_image?.[0]) {
        const uploaded = await uploadToCloudinary(
            files.passage_image[0],
            "passage_images"
        );
        passageImageUrl = uploaded.secure_url;
    }

    const isExistingPassage = await Passage.findOne({ passageCode: payload.passageCode });

    if (isExistingPassage) {
        throw new BadRequestError("Passage with this code already exists");
    }

    const passage = await Passage.create({ ...payload, passageImageUrl });

    if (!passage) {
        throw new BadRequestError("Failed to create passage");
    }
    return passage;
};


export const passageService = {
    createPassage
}