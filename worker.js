import { User } from "./models/User.js";
import { Profile } from "./models/Profile.js";
import fetch from "node-fetch";
import updateStatus from "./helpers/updateStatus.js";
import updateRating from "./helpers/updateRating.js";
import { Problem } from "./models/Problem.js";

import { dbConnect } from './config/database.js';

const syncSubs = async (userId, profileId) => {
    try {
        const coder = await User.findById(userId);
        const profile = await Profile.findById(profileId);
        // Updating Submissions
        const cf = profile.codeforces;
        const lc = profile.leetcode;

        const { lastUpdated } = coder.submissions;


        //leetcode -> 3 / 4 API calls
        if (lc.handle) {
            //get solved count
            let solved = await fetch(`https://leetcode-api-osgb.onrender.com/${lc.handle}/solved`);
            solved = await solved.json();

            if (solved?.solvedProblem) {
                lc.solved = solved.solvedProblem;
                profile.markModified(`leetcode.solved`);

                await profile.save();

                console.log(`✅ API fetch success : /lc/solved/${lc.handle}`)
            }
            else {
                console.log(`❌ API fetch failed : /lc/solved/${lc.handle}`)
            }

            //get categories
            let tags = await fetch(`https://leetcode-api-osgb.onrender.com/skillStats/${lc.handle}`);
            tags = await tags.json();

            if (tags?.data) {
                tags = tags.data.matchedUser.tagProblemCounts;

                tags = [...new Set(Object.values(tags).flat())];

                let total = 0;
                const categories = tags.map(x => {
                    total += x.problemsSolved;
                    return {
                        tag: x.tagName,
                        count: x.problemsSolved
                    }
                })

                console.log(`✅ API fetch success : /lc/tags/${lc.handle}, tags count : ${categories.length} `)

                lc.categories = categories;
                lc.total = total;

                profile.markModified(`leetcode.categories`);
                profile.markModified(`leetcode.total`);

                await profile.save();

            } else {
                console.log(`❌ API fetch failed : /lc/tags/${lc.handle}`)
            }

            //get submissions
            let subs = await fetch(`https://leetcode-api-osgb.onrender.com/${lc.handle}/submission`);
            subs = await subs.json();
            if (subs?.submission) {
                subs = subs.submission;
                console.log(`✅ API fetch success : /lc/subs/${lc.handle}, submissions count : ${subs.length} `)

                for (const sub of subs) {
                    const url = `https://leetcode.com/problems/${sub.titleSlug}/description/`
                    const name = sub.titleSlug;
                    const platform = "leetcode";

                    let prb = await Problem.findOne({ name, platform: "leetcode" });

                    let tags = prb?.tags;
                    let difficulty = prb?.difficulty;
                    const status = sub.statusDisplay === "Accepted" ? "AC" : sub.statusDisplay;

                    //get problem details
                    if (!prb) {
                        prb = await fetch(`https://leetcode-api-osgb.onrender.com/select?titleSlug=${name}`);
                        prb = await prb.json();

                        const { topicTags } = prb;
                        difficulty = prb.difficulty;

                        tags = topicTags.map((topic) => topic.name)
                    }

                    const stale = await updateStatus({ url, name, platform, difficulty, tags }, status, coder, profile, lastUpdated, sub.timestamp * 1000);
                    if (stale) break;
                }
            } else {
                console.log(`❌ API fetch failed : /lc/subs/${lc.handle}`)
            }

        }
        else {
            console.log(`❌ No lc handle found`)
        }

        //codeforces -> 1 API call
        if (cf.handle) {
            //get submissions and build heatmap and build category array

            let subs = await fetch(`https://codeforces.com/api/user.status?handle=${cf.handle}`);
            subs = await subs.json();

            if (subs?.status === "OK") {
                subs = subs.result;
                console.log(`✅ API fetch success : /cf/subs/${cf.handle}, submissions count : ${subs.length} `)

                subs.reverse();//since heatmap has limit-cap (so sending the recent ones last (older ones fall out)) 

                for (const sub of subs) {
                    const url = `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`
                    const { name, tags } = sub.problem;
                    const platform = "codeforces";
                    const difficulty = sub.problem.rating;
                    const status = sub.verdict === "OK" ? "AC" : sub.verdict;

                    const stale = await updateStatus({ url, name, platform, difficulty, tags }, status, coder, profile, lastUpdated, sub.creationTimeSeconds * 1000);
                    if (stale) break;
                }
            }
            else {
                console.log(`❌ API fetch failed : /cf/subs/${cf.handle}`)
            }
        }
        else {
            console.log(`❌ No cf handle found`)
        }

        coder.submissions.lastUpdated = new Date();

        await coder.save();
        await profile.save();

        console.log(`Updated subs ✅`);

    } catch (err) {
        console.error("❌ Error updating subs", err);
    }
}
const syncRatings = async (userId, profileId) => {
    try {
        const profile = await Profile.findById(profileId);
        const cf = profile.codeforces;
        const cc = profile.codechef;
        const lc = profile.leetcode;

        if (cf.handle) {
            let ratings = await fetch(`https://codeforces.com/api/user.rating?handle=${cf.handle}`);
            ratings = await ratings.json();

            if (ratings?.status === "OK") {
                ratings = ratings.result;

                console.log(`✅ API fetch success : /cf/rating/${cf.handle}, contests count : ${ratings.length} `)

                for (const delta of ratings) {
                    const name = delta.contestName;
                    const rating = Math.round(delta.newRating);
                    const { rank } = delta;
                    const date = new Date(delta.ratingUpdateTimeSeconds * 1000);
                    const url = `https://codeforces.com/contest/${delta.contestId}`

                    await updateRating({ name, rating, rank, date, url }, 'codeforces', profile);
                }
            }
            else {
                console.log(`❌ API fetch failed : /cf/ratings/${cf.handle}`)
            }

        }
        else {
            console.log(`❌ No cf handle found`)
        }

        if (lc.handle) {
            let ratings = await fetch(`https://leetcode-api-osgb.onrender.com/${lc.handle}/contest`);
            ratings = await ratings.json();

            if (ratings?.contestParticipation) {
                ratings = ratings.contestParticipation;

                console.log(`✅ API fetch success : /lc/ratings/${lc.handle}, contests count : ${ratings.length} `)

                for (const delta of ratings) {
                    const name = delta.contest.title;
                    const rating = Math.round(delta.rating);
                    const rank = delta.ranking;
                    const date = new Date(delta.contest.startTime * 1000);
                    const url = `https://leetcode.com/contest/${delta.contest.title.toLowerCase().replaceAll(' ', '-')}/`;

                    await updateRating({ name, rating, rank, date, url }, 'leetcode', profile);

                }
            } else {
                console.log(`❌ API fetch failed : /lc/ratings/${lc.handle}`)
            }
        }
        else {
            console.log(`❌ No lc handle found`)
        }
        if (cc.handle) {
            let ratings = await fetch(`https://codechef-api.vercel.app/handle/${cc.handle}`);
            ratings = await ratings.json();

            if (ratings?.ratingData) {
                ratings = ratings.ratingData;

                console.log(`✅ API fetch success : /cc/ratings/${cc.handle}, contests count : ${ratings.length} `)

                for (const delta of ratings) {
                    const name = delta.name;
                    const rating = Math.round(delta.rating);
                    const { rank } = delta;
                    const date = new Date(delta.end_date);
                    const url = `https://www.codechef.com/${delta.code}`;

                    await updateRating({ name, rating, rank, date, url }, 'codechef', profile);

                }
            } else {
                console.log(`❌ API fetch failed : /cc/ratings/${cc.handle}`)
            }
        }
        else {
            console.log(`❌ No cc handle found`)
        }
        await profile.save();

        console.log(`Updated ratings ✅`);

    } catch (err) {
        console.error("❌ Error updating ratings", err);
    }
}
//Heatmap update -> for CC and LC -> Directly replacing whole array
const syncHeatmaps = async (userId, profileId) => {
    try {
        const profile = await Profile.findById(profileId);
        const cc = profile.codechef;
        const lc = profile.leetcode;

        if (cc.handle) {
            let raw_data = await fetch(`https://codechef-api.vercel.app/handle/${cc.handle}`);
            raw_data = await raw_data.json();

            if (raw_data?.heatMap) {
                raw_data = raw_data.heatMap;

                console.log(`✅ API fetch success : /cc/heatmap/${cc.handle}, days count : ${raw_data.length} `)

                const formatted = raw_data.map(x => {
                    return { date: x.date, subs: x.value }
                })

                profile.codechef.heatmap = formatted;

                profile.markModified('codechef.heatmap');

                await profile.save();
            }
            else {
                console.log(`❌ API fetch failed : /cc/heatmap/${cc.handle}`)
            }
        }
        else {
            console.log(`❌ No cc handle found`)
        }

        if (lc.handle) {
            let raw_data = await fetch(`https://leetcode-api-osgb.onrender.com/${lc.handle}/calendar`);
            raw_data = await raw_data.json();

            if (raw_data?.submissionCalendar) {
                raw_data = raw_data.submissionCalendar;

                let hm_data = JSON.parse(raw_data);

                // Converting to array of { date, subs }
                const formatted = Object.entries(hm_data).map(([timestampStr, subs]) => {
                    const timestamp = Number(timestampStr) * 1000; // Convert to milliseconds
                    const cell = new Date(timestamp);

                    const year = cell.getUTCFullYear();
                    const month = String(cell.getUTCMonth() + 1);
                    const day = String(cell.getUTCDate());
                    const date = `${year}-${month}-${day}`;

                    return { date, subs };
                });

                console.log(`✅ API fetch success : /lc/heatmap/${lc.handle}, days count : ${formatted.length} `)


                profile.leetcode.heatmap = formatted;

                profile.markModified('leetcode.heatmap');

                await profile.save();

            } else {
                console.log(`❌ API fetch failed : /lc/heatmap/${lc.handle}`)
            }
        }
        else {
            console.log(`❌ No lc handle found`)
        }

        console.log(`Updated heatmaps ✅`);

    } catch (err) {
        console.error("❌ Error updating heatmaps", err);
    }
}
// Fetch and update
const updateData = async (user) => {
    try {
        if (!(user.profile)) return;

        console.log("Sync in progress for User : ", user.email);

        const profile = await Profile.findById(user.profile);

        if (user.handlesUpdated) {
            console.log("Handles updated : flushing old data...");
            user.submissions.data = [];

            const defaultProfile = new Profile();
            const cf = profile.codeforces.handle;
            const cc = profile.codechef.handle;
            const lc = profile.leetcode.handle;

            profile.codeforces = defaultProfile.codeforces;
            profile.codechef = defaultProfile.codechef;
            profile.leetcode = defaultProfile.leetcode;

            profile.codeforces.handle = cf;
            profile.codechef.handle = cc;
            profile.leetcode.handle = lc;

            user.handlesUpdated = false;

            await user.save();
            await profile.save();

            console.log("Proceeding to fetch new data...")
        }

        console.log("Updating Submissions...")
        await syncSubs(user._id, user.profile);

        console.log("Updating Ratings...")
        await syncRatings(user._id, user.profile);

        console.log("Updating Heatmaps...")
        await syncHeatmaps(user._id, user.profile);


    } catch (err) {
        console.error("❌ Error in sync for user : ", user.email, err);
    }

    console.log();
};

// Main scheduled function
const updateAllUsers = async () => {
    console.log("Starting DataSync time : ", (new Date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));

    try {
        const users = await User.find();

        for (const user of users) {
            await updateData(user);
        }

        console.log("All users updated. time : ", (new Date).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
    } catch (err) {
        console.error("Scheduler encountered an error:", err);
    }
};


import mongoose from "mongoose";

async function fun() {
    try {
        await dbConnect();
        await updateAllUsers();
    } catch (error) {
        console.log("Auto Update failed : ", error);
    }
    finally {
        await mongoose.disconnect();
        console.log("Disconnected db and exiting ✅");
        process.exit(0);  // force exit if needed
    }
}

fun();