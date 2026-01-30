const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/userSchema");
const verifyToken = require("../middlewares/verifyToken");
const { cloudinary } = require("../middlewares/cloudinary");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ================= REGISTER ================= */
router.post("/register", upload.single("image"), async (req, res) => {
  try {
    const { firstName, lastName, dob, email, password } = req.body;

    if (!firstName || !lastName || !dob || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    let image = "";
    let imagePublicId = "";

    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "users" }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          })
          .end(req.file.buffer);
      });

      image = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName,
      lastName,
      dob,
      email,
      password: hashedPassword,
      image,
      imagePublicId,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        dob: user.dob,
        email: user.email,
        image: user.image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_KEY, {
      expiresIn: "1d",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        dob: user.dob,
        email: user.email,
        image: user.image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

/* ================= PROFILE ================= */
router.get("/profile", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json({ user });
});

/* ================= UPDATE ================= */
router.put("/update", upload.single("image"), verifyToken, async (req, res) => {
  const update = { ...req.body };
  if (update.password) {
    update.password = await bcrypt.hash(update.password, 10);
  }

  if (req.file) {
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: "users" }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        })
        .end(req.file.buffer);
    });

    update.image = uploadResult.secure_url;
    update.imagePublicId = uploadResult.public_id;
  }

  const user = await User.findByIdAndUpdate(req.user.id, update, {
    new: true,
  }).select("-password");

  res.json({ message: "Profile updated", user });
});

/* ================= ALL USERS ================= */
router.get("/all", verifyToken, async (req, res) => {
  const users = await User.find().select("firstName lastName email dob image");
  res.json({ users });
});

module.exports = router;
