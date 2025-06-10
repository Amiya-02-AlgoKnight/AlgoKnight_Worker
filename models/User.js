import mongoose from "mongoose";


const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile",
        reqired: true
    },
    submissions: {
        data: [{
            task: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Problem",
            },
            status: {
                type: String,   //AC, WA, TLE, MLE, RE, CE
                required: true,
            },
            time: {
                type: Date,
                required: true,
            }
        }],
        lastUpdated: {
            type: Date,
            required: true,
            default: new Date(0)
        }
    },
    smartsheet: {
        sheet: [{
            task: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Problem",
            },
            count: {
                type: Number,      //No of solvers in user's network
                required: true,
            },
        }],
        lastUpdated: {
            type: Date,
            required: true,
            default: new Date(0)
        }
    },
    notes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Note",
    }],
    friends: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    otp: {
        type: String,
        default: "000000"
    },
    favoriteContests: [{
        name: String,
        url: String,
        platform: String,
        short_note: String,
    }],
    stumbles: [{
        name: String,
        summary: String,
        url: String,
        platform: String,
        hint: String,
        intuition: String,
        status: String,
        solution: String   //link to submitted code or any file etc 
    }],
    concepts: [{
        title: String,
        description: String,
        notes: {
            basic: String,
            intermediate: String,
            advanced: String,
        },
        problemLinks: [String]     //Array of problem links
    }],
    handlesUpdated: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });


const msl = 200;
//Max 200 submissions will be stored 
//Don't worry tags of codeforces will be updated separately
//200+ array length slows down querying in mongoDB

userSchema.pre('save', function (next) {
    if (this.submissions.data.length > msl) {
        const removeCount = this.submissions.data.length - msl;
        this.submissions.data = this.submissions.data.sort((a, b) => a.time - b.time).slice(removeCount);
        //Keeps the latest 200 submissions (Can be from any platforms but latest 200 overall)
    }
    next();
})


export const User = mongoose.model("User", userSchema);