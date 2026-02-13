const jwt = require("jsonwebtoken");
const Auth = require("../model/Auth");
const { uploadFromBuffer } = require("../utils/cloudinary");

const JWT_SECRET = process.env.JWT_SECRET;

// POST /users/login
// Đăng nhập, trả về JWT token
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Vui lòng nhập đầy đủ username và password" });
  }

  try {
    // Tìm user đúng username & password (2 tài khoản mặc định)
    const user = await Auth.findOne({ username, password });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Sai tài khoản hoặc mật khẩu" });
    }

    // Tạo token, chứa userId & username
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("Lỗi khi login:", err);
    return res.status(500).json({ message: "Lỗi server khi login" });
  }
};

// GET /auth/profile
// Lấy thông tin tài khoản đang đăng nhập (dựa trên token)
exports.getProfile = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: "Unauthorized - missing user from token" });
  }

  return res.json({
    id: user._id,
    username: user.username,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
};

// PUT /auth/avatar
// Cập nhật avatar cho tài khoản đang đăng nhập (dựa trên token), nhận file upload
exports.updateAvatar = async (req, res) => {
  const userId = req.userId || (req.user && req.user._id);

  if (!userId) {
    return res
      .status(401)
      .json({ message: "Unauthorized - missing user from token" });
  }

  if (!req.file || !req.file.buffer) {
    return res
      .status(400)
      .json({ message: "Thiếu file avatar (multipart/form-data, field name: avatar)" });
  }

  try {
    const avatarUrl = await uploadFromBuffer(req.file.buffer, { folder: "avatars" });

    const user = await Auth.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy user" });
    }

    return res.json({
      message: "Cập nhật avatar thành công",
      user,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật avatar:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi cập nhật avatar" });
  }
};
