import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
    userName: {
        type: String,
        default: "..."
    },
    fullName: {
        type: String,
        default: "...",
    },
    bio: {
        type: String,
        default: "..."
    },
    university: {
        type: String,
        default: "..."
    },
    yearOfStudy: {
        type: String,
        default: "..."
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    codeforces: {
        handle: {
            type: String,
            default: ''
        },
        contests: {
            type: [{
                name: String,
                rating: Number,
                rank: Number,
                date: Date,
                url: String,
            }],
            default: []
        },
        heatmap: {
            type: [{
                date: String,
                subs: Number,
            }],
            default: []
        },
        solved: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            default: 0,
        },
        categories: {
            type: [{
                tag: String,
                count: Number,
            }],
            default: []
        }
    },
    codechef: {
        handle: {
            type: String,
            default: ''
        },
        contests: {
            type: [{
                name: String,
                rating: Number,
                rank: Number,
                date: Date,
                url: String,
            }],
            default: []
        },
        heatmap: {
            type: [{
                date: String,
                subs: Number,
            }],
            default: []
        },
        solved: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            default: 0,
        },
        categories: {
            type: [{
                tag: String,
                count: Number,
            }],
            default: []
        }
    },
    leetcode: {
        handle: {
            type: String,
            default: ''
        },
        contests: {
            type: [{
                name: String,
                rating: Number,
                rank: Number,
                date: Date,
                url: String,
            }],
            default: []
        },
        heatmap: {
            type: [{
                date: String,
                subs: Number,
            }],
            default: []
        },
        solved: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            default: 0,
        },
        categories: {
            type: [{
                tag: String,
                count: Number,
            }],
            default: []
        }
    },


}, { timestamps: true })

const mhl = 185; //Max Heatmap Length (~6 months kept)

profileSchema.pre('save', function (next) {
    if (this.codeforces.heatmap.length > mhl) {
        const removeCount = this.codeforces.heatmap.length - mhl;
        this.codeforces.heatmap = this.codeforces.heatmap.slice(removeCount);
    }
    if (this.codechef.heatmap.length > mhl) {
        const removeCount = this.codechef.heatmap.length - mhl;
        this.codechef.heatmap = this.codechef.heatmap.slice(removeCount);
    }
    if (this.leetcode.heatmap.length > mhl) {
        const removeCount = this.leetcode.heatmap.length - mhl;
        this.leetcode.heatmap = this.leetcode.heatmap.slice(removeCount);
    }

    next();
})


export const Profile = mongoose.model("Profile", profileSchema);
