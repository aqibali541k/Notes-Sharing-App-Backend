const mongoose = require("mongoose")

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },

        text: {
            type: String,
            required: true
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isPrivate: {
            type: Boolean,
            default: true
        },

        sharedWith: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    { timestamps: true }
)
const Notes = mongoose.model("Notes", noteSchema)
module.exports = Notes;
