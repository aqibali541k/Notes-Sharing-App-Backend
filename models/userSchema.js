const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    dob: {
      type: Date,
      required: true,
      get: (value) => {
        if (!value) return value;
        return value.toISOString().split("T")[0]; // ✅ YYYY-MM-DD
      },
    },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  },
);

module.exports = mongoose.model("User", userSchema);
