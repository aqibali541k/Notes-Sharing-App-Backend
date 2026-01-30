const express = require("express");
const mongoose = require("mongoose");
const Notes = require("../models/notesSchema");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");

// ✅ Create Note
router.post("/create", verifyToken, async (req, res) => {
  try {
    const { title, text, isPrivate, sharedWith } = req.body;
    if (!title || !text) {
      return res.status(400).json({ message: "title and text are required" });
    }
    const note = new Notes({
      title,
      text,
      user: req.user.id,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      sharedWith: sharedWith || [],
    });
    await note.save();
    res.status(201).json({ message: "Note created successfully", note });
  } catch (error) {
    return res.status(400).json({
      message: "Something went wrong while creating notes",
    });
  }
});

// ✅ Read User Notes
router.get("/read", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notes = await Notes.find({ user: userId })
      .populate("user", "firstName lastName email")
      .populate("sharedWith", "firstName lastName email");
    res.status(200).json({ notes });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching notes" });
  }
});

// ✅ Update Privacy
router.put("/privacy/:id", verifyToken, async (req, res) => {
  try {
    const { isPrivate } = req.body;
    const updatedNote = await Notes.findByIdAndUpdate(
      req.params.id,
      { isPrivate },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Note privacy updated", note: updatedNote });
  } catch (error) {
    res.status(500).json({ message: "Error updating note privacy" });
  }
});

// ✅ Public Notes
router.get("/public", async (req, res) => {
  try {
    const publicNotes = await Notes.find({ isPrivate: false }).populate(
      "user",
      "firstName lastName email",
    );
    res.status(200).json({ notes: publicNotes });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Server error while fetching public notes" });
  }
});

// ✅ Delete Note
router.delete("/delete/:id", verifyToken, async (req, res) => {
  try {
    await Notes.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.status(200).json({ message: "Note deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Something went wrong while deleting notes" });
  }
});

// ✅ Update Note
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const { title, text } = req.body;
    const updatedNote = await Notes.findByIdAndUpdate(
      req.params.id,
      { text, title },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Note updated successfully", note: updatedNote });
  } catch (error) {
    res.status(500).json({ message: "Error updating note" });
  }
});

// ✅ Share Note// ✅ Share Note (OWNER ONLY)
router.post("/share/:id", verifyToken, async (req, res) => {
  try {
    const { sharedWith } = req.body;
    const userId = req.user.id;

    const note = await Notes.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });

    // 🔒 ONLY OWNER CAN SHARE
    if (note.user.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Only owner can share this note" });
    }

    // 🔒 REMOVE OWNER FROM SHARED LIST
    const cleanSharedWith = sharedWith
      .map((id) => id.toString())
      .filter((id) => id !== userId.toString());

    note.sharedWith = [...new Set(cleanSharedWith)];
    await note.save();

    res.json({
      message: "Note shared successfully",
      note,
    });
  } catch (err) {
    res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
});

// ✅ Notes shared with me
router.get("/shared", verifyToken, async (req, res) => {
  try {
    const notes = await Notes.find({ sharedWith: req.user.id }).populate(
      "user",
      "firstName lastName email",
    );
    res.json({ notes });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
// ✅ Analytics Route
router.get("/analytics", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalCreated = await Notes.countDocuments({ user: userId });
    const sharedNotes = await Notes.countDocuments({
      user: userId,
      sharedWith: { $exists: true, $ne: [] },
    });
    const privateNotes = await Notes.countDocuments({
      user: userId,
      isPrivate: true,
    });
    const publicNotes = await Notes.countDocuments({
      user: userId,
      isPrivate: false,
    });

    // ✅ Monthly breakdown
    const monthlyData = await Notes.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          created: { $sum: 1 },
          shared: {
            $sum: {
              $cond: [{ $gt: [{ $size: "$sharedWith" }, 0] }, 1, 0],
            },
          },
          private: {
            $sum: { $cond: [{ $eq: ["$isPrivate", true] }, 1, 0] },
          },
          public: {
            $sum: { $cond: [{ $eq: ["$isPrivate", false] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formatted = monthlyData.map((item) => ({
      month: months[item._id - 1],
      created: item.created,
      shared: item.shared,
      private: item.private,
      public: item.public,
    }));

    res.json({
      totalCreated,
      sharedNotes,
      privateNotes,
      publicNotes, // ✅ add this
      monthlyData: formatted,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching analytics" });
  }
});
module.exports = router;
