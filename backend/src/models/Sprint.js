import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Sprint Model
 * Time-boxed agile cycle containing planned story points,
 * velocity metrics, and rollover tracking upon completion.
 */
const SprintSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    goal: {
      type: String,
      default: '',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'Completed'],
      default: 'Planning',
    },
    plannedPoints: {
      type: Number,
      default: 0,
    },
    completedPoints: {
      type: Number,
      default: 0,
    },
    velocity: {
      type: Number,
      default: 0, // percentage 0-100%
    },
    rolledOverCount: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

SprintSchema.index({ project: 1, status: 1 });
SprintSchema.index({ startDate: 1, endDate: 1 });

const Sprint = mongoose.model('Sprint', SprintSchema);
export default Sprint;
