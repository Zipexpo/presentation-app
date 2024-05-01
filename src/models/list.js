import mongoose, { Schema } from "mongoose";
import { sluggerPlugin } from "mongoose-slugger-plugin";

const listSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    presenDate: {
      type: Date,
      required: true,
    },
    durationEach: {
      type: Number,
      required: true,
    },
    criteria: {
      type: [
        {
          cid: String,
          quote: String,
          selection: { type: [{ text: String }] },
        },
      ],
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    presentation: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "Presentation",
        },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.models?.List || mongoose.model("List", listSchema);
