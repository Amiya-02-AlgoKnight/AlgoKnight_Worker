import { Problem } from "../models/Problem.js"

//This is an internal handler (route is not called by frontend directly)


const createProblem = async (details) => {

    const { url } = details;

    try {
        const prbExists = await Problem.findOne({ url });
        if (prbExists) return prbExists;
        else {
            const prb = await Problem.create(details);
            // console.log("Problem created successfully");
            return prb;
        }
    }
    catch (err) {
        console.error("Problem create failed. Please try again later", err);
        return;
    }
}

export default createProblem;