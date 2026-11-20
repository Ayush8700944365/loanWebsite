import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true },
);

const benefitSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  displayOrder: { type: Number, min: 0, default: 0 },
}, { _id: true });

const teamMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  designation: { type: String, required: true, trim: true, maxlength: 100 },
  biography: { type: String, trim: true, maxlength: 500, default: "" },
  photoStorageKey: { type: String, trim: true, default: "" },
  displayOrder: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: false },
}, { _id: true });

const websiteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "main",
      unique: true,
      required: true,
    },

    hero: {
      bannerNotice: { type: String, default: "" },
      headline: { type: String, default: "" },
      subheadline: { type: String, default: "" },
    },

    about: {
      intro: { type: String, default: "" },
      mission: { type: String, default: "" },
      vision: { type: String, default: "" },
    },

    faqs: {
      type: [faqSchema],
      default: [],
    },

    benefits: { type: [benefitSchema], default: [] },
    team: { type: [teamMemberSchema], default: [] },
    homepageGoals: {
      customersReachedTarget: { type: Number, min: 0, default: null },
      disbursementsTarget: { type: Number, min: 0, default: null },
      disbursementAmountTarget: { type: Number, min: 0, default: null },
      disbursementAmountUnit: { type: String, enum: ["lakh", "crore"], default: "lakh" },
    },

    updatedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const WebsiteContent = mongoose.model("WebsiteContent", websiteContentSchema);

export default WebsiteContent;
