import mongoose from "mongoose"


const connectDB = () => {
    const uri = process.env.MONGO_URI;
    mongoose
        .connect(uri)
        .then(() => {
            console.log("Mongodb is successfully connected");
        })
        .catch((err) => {
            console.log(err);
        });
    
    
}
    
export default connectDB;

