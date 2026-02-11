const mongoose = require("mongoose");

// Các tài khoản mặc định được phép truy cập
const DEFAULT_USERS = [
  {
    username: "buitranyennhi",
    password: "Nhi081003",
    name: "Bùi Trần Yến Nhi",
  },
  {
    username: "huynhphuocthien",
    password: "Thien021003",
    name: "Huỳnh Phước Thiện",
  },
];

const authSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: "https://bit.ly/default-avatar" },
  },
  { timestamps: true }
);

// Đảm bảo trong database chỉ tồn tại đúng 2 tài khoản mặc định này
authSchema.statics.syncDefaultUsers = async function () {
  const AuthModel = this;

  const usernames = DEFAULT_USERS.map((u) => u.username);

  // Xoá mọi user không nằm trong danh sách mặc định
  await AuthModel.deleteMany({ username: { $nin: usernames } });

  // Upsert (tạo mới nếu chưa có) 2 user mặc định
  for (const user of DEFAULT_USERS) {
    await AuthModel.updateOne(
      { username: user.username },
      { $setOnInsert: user },
      { upsert: true }
    );
  }
};

const Auth = mongoose.model("Auth", authSchema);

// Xuất kèm danh sách user mặc định nếu cần dùng ở nơi khác
Auth.DEFAULT_USERS = DEFAULT_USERS;

module.exports = Auth;
