import createProblem from "./createProblem.js";


const fun = async (prob_exists, prob_details, status, coder, profile, lastUpdated, subTime) => {

    const { url, name, platform, difficulty, tags } = prob_details;

    const cell = new Date(subTime);

    const year = cell.getUTCFullYear();
    const month = String(cell.getUTCMonth() + 1);
    const day = String(cell.getUTCDate());
    const subDate = `${year}-${month}-${day}`;

    let prb = prob_exists;
    
    if(!prb) prb = await createProblem(prob_details);

    if (!prb) {
        console.log("Problem or user data is corrupted");
        return false; //true for stale data only
    }

    try {        
        if (subTime < lastUpdated.getTime()) {  //dig only upto new submissions 
            console.log("🚫 Stale data encountered, platform : ", prob_details.platform);
            return true; //stale data (Already stored in db on prev round of polling)
        }

        //CF heatmap
        if (platform === 'codeforces') {
            const { heatmap } = profile.codeforces;
            if (heatmap.length > 0 && heatmap[heatmap.length - 1].date == subDate) {
                heatmap[heatmap.length - 1].subs++;
            }
            else {
                heatmap.push({
                    date: subDate,
                    subs: 1
                })
            }
            profile.markModified('codeforces');
        }


        const repeatedSub = coder.submissions.data.filter((sub) => sub.task.toString() === prb._id.toString())[0];   //direct obj id comparision not allowed

        //since only one submission stored per qn (AC if any or the Last one)
        if (repeatedSub) {
            if (repeatedSub.status === 'AC') {  //Only 1 AC is enough to track
                return false;
            }
            repeatedSub.status = status
        }
        else {
            coder.submissions.data.push({
                task: prb._id,
                status,
                time: new Date(subTime),
            });
        }

        if (status === 'AC') {        //Repeated accepted problems don't come this far (Returned at line 56)
            prb.solvers.push(coder._id);
            await prb.save();
        }

        //CF category(tags) list
        if (platform === 'codeforces') {
            if (status === 'AC') {
                profile[platform].solved++;
                profile.markModified('codeforces');

                tags.forEach(tag => {
                    const repeatedTag = profile[platform].categories.filter((sub) => sub.tag === tag)[0];

                    profile[platform].total++;

                    if (repeatedTag) {
                        repeatedTag.count++;
                    }
                    else {
                        profile[platform].categories.push(
                            {
                                tag,
                                count: 1
                            }
                        )
                    }
                });
            }
        }

        coder.markModified(`submissions.data`);

        return false; //Non-stale data
    }
    catch (err) {
        console.error("updateStatus failed. Please try again later", err);

        return false;
    }
}

export default fun;