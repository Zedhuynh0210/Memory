var express = require('express');
var router = express.Router();
const path = require('path');
const multer = require('multer');
const authController = require('../controller/authController');
const authMiddleware = require('../middleware/auth');

// Cấu hình multer để upload avatar vào thư mục public/uploads/avatars
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'avatars'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + file.fieldname + ext);
  }
});

const avatarFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh'), false);
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Đăng nhập và lấy JWT token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: string
 *               password:
 *                 type: string
 *                 example: string
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về token và thông tin user
 *       400:
 *         description: Thiếu username hoặc password
 *       401:
 *         description: Sai tài khoản hoặc mật khẩu
 */
router.post('/login', authController.login);

/* GET auth root (optional test endpoint, không document trong swagger) */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Lấy thông tin tài khoản đang đăng nhập
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin profile của tài khoản hiện tại
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * @swagger
 * /auth/avatar:
 *   put:
 *     summary: Cập nhật avatar cho tài khoản đang đăng nhập (dựa trên token), upload file ảnh
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - avatar
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật avatar thành công
 *       400:
 *         description: Thiếu avatar hoặc dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy user
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.put(
  '/avatar',
  authMiddleware,
  uploadAvatar.single('avatar'),
  authController.updateAvatar
);

module.exports = router;
