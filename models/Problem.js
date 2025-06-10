import mongoose from "mongoose";


const problemSchema = new mongoose.Schema({
    url : {               //This is the primary key 
        type : String, 
        required : true,
    },
    name : {
        type : String,
        required : true
    },
    platform : {
        type : String,
        required : true,
    },
    difficulty : {
        type : String,
        default : "Random",
    },
    tags : {
        type : [String],
    },
    solvers : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }]
})

export const Problem = mongoose.model("Problem", problemSchema);
