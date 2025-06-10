import mongoose from 'mongoose';
import {config} from 'dotenv';
config();


export const dbConnect = async () => {
    await mongoose.connect(process.env.DB_URL)
    .then(() => {
        console.log("DB connected successfully.✅");
        console.log("Hello from database.");
    })
    .catch((err) => {
        console.log("DB connection issues.❌")
        console.error(err);
    });
}


