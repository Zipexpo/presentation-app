import mongoose, { Schema } from "mongoose";
mongoose.plugin(slug);

const presentationSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  order: {
    type: Number,
  },
  member: {
    type: [
      {
        name: String,
        id: String,
      },
    ],
  },
  thumbnail: {
    type: String,
  },
  projectLink: {
    type: String,
  },
  video: {
    type: String,
  },
  slide: {
    type: String,
  },
  report: {
    type: String,
  },
  note: {
    type: String,
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: "List",
  },
});

const Presentation =
  mongoose.models?.Presentation ||
  mongoose.model("Presentation", presentationSchema);

export default Presentation;
