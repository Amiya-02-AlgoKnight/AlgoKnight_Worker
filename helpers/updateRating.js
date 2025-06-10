
const fun = async (delta, platform, profile) => {

    try {
        const list = profile[platform].contests;

        if (list.length > 0 && list[list.length - 1].date >= delta.date) return;

        profile[platform].contests.push(delta);

        profile.markModified(`${platform}`);

    }
    catch (err) {
        console.error("updateRating failed. Please try again later", err);
    }
}

export default fun;