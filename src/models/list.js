import mongoose, {Schema} from "mongoose";
import slug from'mongoose-slug-generator';
mongoose.plugin(slug);

const listSchema = new Schema({
      title: {
        type: String,
        required: true,
      },
      slug: { type: String, slug: "title", unique: true },
      presenDate: {
        type: Date,
        required: true,
      },
      durationEach: {
        type: Number,
        required: true,
      },
      criteria: {
        type: [{
          quote: String,
          selection: [String]
        }],
        required: true,
      },
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    },
    { timestamps: true });

const List = mongoose.models?.List || mongoose.model("List",listSchema);

export default List;