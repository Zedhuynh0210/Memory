const Memory = require("../model/Memory");
const fs = require("fs");
const path = require("path");

// POST /memories
// Tạo kỷ niệm mới, upload ảnh và lưu đường dẫn vào imageUrl
exports.createMemory = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: "Unauthorized - missing user from token" });
  }

  const { title, description, location, mood } = req.body;

  if (!title || !description) {
    return res.status(400).json({
      message: "Vui lòng nhập đầy đủ title và description",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      message:
        "Thiếu file ảnh kỷ niệm (multipart/form-data, field name: image)",
    });
  }

  const imageUrl = `/uploads/memories/${req.file.filename}`;

  try {
    const memory = await Memory.create({
      title,
      description,
      imageUrl,
      location,
      mood,
      authorName: user.name || user.username,
    });

    return res.status(201).json({
      message: "Tạo kỷ niệm thành công",
      memory,
    });
  } catch (err) {
    console.error("Lỗi khi tạo kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi tạo kỷ niệm" });
  }
};

// GET /memories
// Lấy danh sách tất cả kỷ niệm (mới nhất trước)
exports.getMemories = async (req, res) => {
  try {
    const memories = await Memory.find().sort({ createdAt: -1 });
    return res.json({ memories });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy danh sách kỷ niệm" });
  }
};

// GET /memories/filter
// Lọc kỷ niệm theo location, authorName, mood và khoảng ngày (createdAt)
exports.filterMemories = async (req, res) => {
  const { location, authorName, mood, fromDate, toDate, date } = req.query;

  const filter = {};

  if (location) {
    filter.location = location;
  }

  if (authorName) {
    filter.authorName = authorName;
  }

  if (mood) {
    filter.mood = mood;
  }

  // Nếu truyền `date` (YYYY-MM-DD) thì lọc trong ngày đó
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  } else {
    // Nếu không có `date` mà có fromDate/toDate thì dùng khoảng
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        const end = new Date(toDate);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }
  }

  try {
    const memories = await Memory.find(filter).sort({ createdAt: -1 });
    return res.json({ memories });
  } catch (err) {
    console.error("Lỗi khi filter kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi filter kỷ niệm" });
  }
};

// GET /memories/history
// Lịch sử các kỷ niệm do user hiện tại đã tạo (mới nhất trước)
exports.getMyMemoriesHistory = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: "Unauthorized - missing user from token" });
  }

  const authorName = user.name || user.username;

  try {
    const memories = await Memory.find({ authorName }).sort({ createdAt: -1 });
    return res.json({ memories });
  } catch (err) {
    console.error("Lỗi khi lấy lịch sử kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy lịch sử kỷ niệm" });
  }
};

// GET /memories/dashboard
// Thống kê tổng quan kỷ niệm cho user hiện tại (dashboard)
exports.getMyMemoriesDashboard = async (req, res) => {
  const user = req.user;

  if (!user) {
    return res
      .status(401)
      .json({ message: "Unauthorized - missing user from token" });
  }

  const authorName = user.name || user.username;
  const { fromDate, toDate } = req.query;

  // Điều kiện lọc chung theo user (và optional theo khoảng ngày)
  const match = { authorName };

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) {
      match.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setDate(end.getDate() + 1);
      match.createdAt.$lt = end;
    }
  }

  try {
    const [totalCount, statusAgg, moodAgg, monthlyAgg] = await Promise.all([
      Memory.countDocuments(match),
      Memory.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Memory.aggregate([
        { $match: match },
        { $group: { _id: "$mood", count: { $sum: 1 } } },
      ]),
      Memory.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
    ]);

    // Chuẩn hoá kết quả thành object dễ dùng cho frontend
    const statusStats = {};
    statusAgg.forEach((item) => {
      statusStats[item._id || "Khác"] = item.count;
    });

    const monthlyStats = monthlyAgg.map((item) => ({
      year: item._id.year,
      month: item._id.month,
      count: item.count,
    }));

    return res.json({
      authorName,
      totalMemories: totalCount,
      byStatus: statusStats,
      byMonth: monthlyStats,
    });
  } catch (err) {
    console.error("Lỗi khi lấy dashboard kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy dashboard kỷ niệm" });
  }
};

// GET /memories/:id
// Lấy chi tiết 1 kỷ niệm theo id
exports.getMemoryById = async (req, res) => {
  const { id } = req.params;

  try {
    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({ message: "Không tìm thấy kỷ niệm" });
    }

    return res.json({ memory });
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi lấy chi tiết kỷ niệm" });
  }
};

// PUT /memories/:id
// Cập nhật kỷ niệm, có thể kèm hoặc không kèm ảnh mới
exports.updateMemory = async (req, res) => {
  const { id } = req.params;
  const { title, description, location, mood, status } = req.body;

  try {
    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({ message: "Không tìm thấy kỷ niệm" });
    }

    if (title !== undefined) memory.title = title;
    if (description !== undefined) memory.description = description;
    if (location !== undefined) memory.location = location;
    if (mood !== undefined) memory.mood = mood;
    if (status !== undefined) memory.status = status;

    // Nếu có ảnh mới, cập nhật imageUrl và (tuỳ chọn) xoá file cũ
    if (req.file) {
      const oldImagePath =
        memory.imageUrl && memory.imageUrl.startsWith("/uploads/memories/")
          ? path.join(__dirname, "..", "public", memory.imageUrl)
          : null;

      memory.imageUrl = `/uploads/memories/${req.file.filename}`;

      if (oldImagePath) {
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.warn("Không xoá được file ảnh cũ:", err.message);
          }
        });
      }
    }

    await memory.save();

    return res.json({
      message: "Cập nhật kỷ niệm thành công",
      memory,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi cập nhật kỷ niệm" });
  }
};

// DELETE /memories/:id
// Xoá kỷ niệm và (tuỳ chọn) xoá luôn file ảnh
exports.deleteMemory = async (req, res) => {
  const { id } = req.params;

  try {
    const memory = await Memory.findById(id);

    if (!memory) {
      return res.status(404).json({ message: "Không tìm thấy kỷ niệm" });
    }

    const imagePath =
      memory.imageUrl && memory.imageUrl.startsWith("/uploads/memories/")
        ? path.join(__dirname, "..", "public", memory.imageUrl)
        : null;

    await Memory.findByIdAndDelete(id);

    if (imagePath) {
      fs.unlink(imagePath, (err) => {
        if (err) {
          console.warn("Không xoá được file ảnh:", err.message);
        }
      });
    }

    return res.json({ message: "Xoá kỷ niệm thành công" });
  } catch (err) {
    console.error("Lỗi khi xoá kỷ niệm:", err);
    return res
      .status(500)
      .json({ message: "Lỗi server khi xoá kỷ niệm" });
  }
};

