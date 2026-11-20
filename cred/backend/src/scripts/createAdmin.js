import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import connectDB from "../config/db.js";
import User from "../models/User.js";

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const createAdmin = async () => {
  try {
    await connectDB();

    const existingAdmin = await User.findOne({
      role: "admin",
    });

    if (existingAdmin) {
      console.log("Admin already exists. Bootstrap blocked.");
      return;
    }

    const name = (await rl.question("Enter Admin Name: ")).trim();

    const email = (await rl.question("Enter Admin Email: "))
      .trim()
      .toLowerCase();

    const username = (await rl.question("Enter Admin Username: "))
      .trim()
      .toLowerCase();

    const password = await rl.question(
      "Enter Admin Password (minimum 6 characters): ",
    );

    if (!name || !email || !username) {
      throw new Error("All fields are required.");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error("Invalid email address.");
    }

    if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
      throw new Error("Invalid username.");
    }

    if (password.length < 6) {
      throw new Error("Password must contain at least 6 characters.");
    }

    const duplicate = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (duplicate) {
      throw new Error("Email or username already exists.");
    }

    const admin = await User.create({
      name,
      email,
      username,
      password,
      role: "admin",
      status: "active",
    });

    console.log("\nAdmin created successfully!");
    console.log("ID:", admin._id.toString());
    console.log("Email:", admin.email);
    console.log("Username:", admin.username);
    console.log("Role:", admin.role);
  } catch (error) {
    console.error("Bootstrap Error:", error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
};

createAdmin();
