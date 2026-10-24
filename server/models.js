const mongoose = require('mongoose');
const { Schema, model } = mongoose;
const ref = (to) => ({ type: Schema.Types.ObjectId, ref: to });
const localDate = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const Department = model('Department', new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  manager: ref('Employee'),
}));

const Employee = model('Employee', new Schema({
  empCode: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'employee'], default: 'employee' },
  department: ref('Department'),
  jobTitle: { type: String, default: '' },
  phone: { type: String, default: '' },
  joiningDate: { type: String, default: localDate },
  photo: { type: String, default: null },
  leaveQuota: { type: Number, default: 24, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}));

const attendanceSchema = new Schema({
  employee: { ...ref('Employee'), required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'leave'], required: true },
});
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
const Attendance = model('Attendance', attendanceSchema);

const Task = model('Task', new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  deadline: { type: String, default: null },
  status: { type: String, enum: ['todo', 'in_progress', 'completed'], default: 'todo' },
  assignedTo: { ...ref('Employee'), required: true },
  completedAt: { type: String, default: null },
  feedback: { type: String, default: '' },
}, { timestamps: true }));

const Leave = model('Leave', new Schema({
  employee: { ...ref('Employee'), required: true },
  type: { type: String, enum: ['casual', 'sick', 'unpaid'], required: true },
  fromDate: { type: String, required: true },
  toDate: { type: String, required: true },
  days: { type: Number, required: true },
  reason: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminNote: { type: String, default: '' },
}, { timestamps: true }));

const Announcement = model('Announcement', new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  category: { type: String, enum: ['general', 'holiday', 'urgent'], default: 'general' },
}, { timestamps: true }));

const Doc = model('Document', new Schema({
  employee: { ...ref('Employee'), required: true },
  type: { type: String, default: 'other' },
  title: { type: String, required: true },
  file: { type: String, required: true },
}, { timestamps: true }));

// Uploaded files live in MongoDB so the app works on serverless hosts with no disk.
const File = model('File', new Schema({
  data: { type: Buffer, required: true },
  type: { type: String, required: true }, // mime type
  name: { type: String, default: '' },
  kind: { type: String, enum: ['photo', 'doc'], required: true },
}));

const ratingSchema = new Schema({
  employee: { ...ref('Employee'), required: true },
  month: { type: String, required: true }, // YYYY-MM
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, default: '' },
});
ratingSchema.index({ employee: 1, month: 1 }, { unique: true });
const Rating = model('Rating', ratingSchema);

async function connect() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
  const dbName = process.env.DB_NAME || 'balcacorp-ems';
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 8000 });
  return dbName;
}

module.exports = { Department, Employee, Attendance, Task, Leave, Announcement, Doc, Rating, File, connect, localDate };
