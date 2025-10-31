const mongoose = require("mongoose");

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Mongodb is connected succesfully ✅");
  } catch (error) {
    console.log("Error connecting to Database❌", error.message);
    process.exit(1);
  }
};
module.exports = connectDb;
