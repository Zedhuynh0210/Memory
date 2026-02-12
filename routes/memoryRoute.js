var express = require('express');
var router = express.Router();
const path = require('path');
const multer = require('multer');
const memoryController = require('../controller/memoryController');
const authMiddleware = require('../middleware/auth');

// Cấu hình multer để upload ảnh kỷ niệm vào thư mục public/uploads/memories
const memoryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'uploads', 'memories'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + file.fieldname + ext);
  }
});

const memoryFileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ cho phép upload file ảnh'), false);
  }
};

const uploadMemoryImage = multer({
  storage: memoryStorage,
  fileFilter: memoryFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

/**
 * @swagger
 * /memories:
 *   post:
 *     summary: Tạo kỷ niệm mới (upload nhiều ảnh)
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - images
 *             properties:
 *               title:
 *                 type: string
 *                 example: Lần đầu đi Đà Lạt cùng nhau
 *               description:
 *                 type: string
 *                 example: Một chuyến đi đầy kỷ niệm...
 *               location:
 *                 type: string
 *                 example: Đà Lạt
 *               mood:
 *                 type: string
 *                 example: 😊
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Tạo kỷ niệm thành công
 *       400:
 *         description: Thiếu dữ liệu hoặc file ảnh không hợp lệ
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.post(
  '/',
  authMiddleware,
  uploadMemoryImage.array('images', 10),
  memoryController.createMemory
);

/**
 * @swagger
 * /memories:
 *   get:
 *     summary: Lấy danh sách tất cả kỷ niệm (public, không cần token)
 *     tags: [Memories]
 *     security: []
 *     responses:
 *       200:
 *         description: Danh sách kỷ niệm
 */
router.get('/', memoryController.getMemories);

/**
 * @swagger
 * /memories/status/draft:
 *   get:
 *     summary: Lấy danh sách kỷ niệm có status = "Nháp" của user hiện tại
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách kỷ niệm Nháp của user hiện tại
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.get(
  '/status/draft',
  authMiddleware,
  memoryController.getDraftMemories
);

/**
 * @swagger
 * /memories/status/completed:
 *   get:
 *     summary: Lấy danh sách kỷ niệm có status = "Hoàn thành" (public, không cần token)
 *     tags: [Memories]
 *     security: []
 *     responses:
 *       200:
 *         description: Danh sách kỷ niệm Hoàn thành
 */
router.get('/status/completed', memoryController.getCompletedMemories);

/**
 * @swagger
 * /memories/history:
 *   get:
 *     summary: Lịch sử các kỷ niệm do user hiện tại đã tạo
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách kỷ niệm của user hiện tại (mới nhất trước)
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.get('/history', authMiddleware, memoryController.getMyMemoriesHistory);

/**
 * @swagger
 * /memories/dashboard:
 *   get:
 *     summary: Thống kê tổng quan kỷ niệm (dashboard) cho user hiện tại (bao gồm số Nháp và Hoàn thành)
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Ngày bắt đầu (YYYY-MM-DD) khi muốn giới hạn khoảng thời gian thống kê
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Ngày kết thúc (YYYY-MM-DD) khi muốn giới hạn khoảng thời gian thống kê
 *     responses:
 *       200:
 *         description: Thống kê tổng số, số Nháp, số Hoàn thành, theo trạng thái và theo tháng
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.get('/dashboard', authMiddleware, memoryController.getMyMemoriesDashboard);

/**
 * @swagger
 * /memories/filter:
 *   get:
 *     summary: Lọc kỷ niệm theo location, authorName, mood và ngày tạo (public, không cần token)
 *     tags: [Memories]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         required: false
 *         description: Địa điểm kỷ niệm
 *       - in: query
 *         name: authorName
 *         schema:
 *           type: string
 *         required: false
 *         description: Tên người viết kỷ niệm
 *       - in: query
 *         name: mood
 *         schema:
 *           type: string
 *         required: false
 *         description: Cảm xúc (😊, 😢, 😍, ...)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Lọc theo một ngày cụ thể (YYYY-MM-DD)
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Ngày bắt đầu (YYYY-MM-DD) khi lọc theo khoảng
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Ngày kết thúc (YYYY-MM-DD) khi lọc theo khoảng
 *     responses:
 *       200:
 *         description: Danh sách kỷ niệm sau khi lọc
 */
router.get('/filter', memoryController.filterMemories);

/**
 * @swagger
 * /memories/{id}:
 *   get:
 *     summary: Lấy chi tiết một kỷ niệm theo id (public, không cần token)
 *     tags: [Memories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kỷ niệm (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Chi tiết kỷ niệm
 *       404:
 *         description: Không tìm thấy kỷ niệm
 *   put:
 *     summary: Cập nhật kỷ niệm theo id (có thể upload NHIỀU ảnh mới)
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kỷ niệm (MongoDB ObjectId)
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               mood:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Nháp, Hoàn thành, Đã xoá]
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Cập nhật kỷ niệm thành công
 *       404:
 *         description: Không tìm thấy kỷ niệm
 *       401:
 *         description: Không có hoặc token không hợp lệ
 *   delete:
 *     summary: Xoá kỷ niệm theo id
 *     tags: [Memories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của kỷ niệm (MongoDB ObjectId)
 *     responses:
 *       200:
 *         description: Xoá kỷ niệm thành công
 *       404:
 *         description: Không tìm thấy kỷ niệm
 *       401:
 *         description: Không có hoặc token không hợp lệ
 */
router.get('/:id', memoryController.getMemoryById);
router.put(
  '/:id',
  authMiddleware,
  uploadMemoryImage.array('images', 10),
  memoryController.updateMemory
);
router.delete('/:id', authMiddleware, memoryController.deleteMemory);

module.exports = router;

