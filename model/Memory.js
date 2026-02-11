const mongoose = require('mongoose');

const memorySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Tiêu đề là bắt buộc'],
    trim: true 
  },
  description: { 
    type: String, 
    required: [true, 'Đừng quên viết vài dòng cảm xúc nhé'] 
  },
  imageUrl: { 
    type: String, 
    required: [true, 'Một tấm ảnh sẽ giúp kỷ niệm sống động hơn'] 
  },
  location: { 
    type: String, // Ví dụ: "Đà Lạt", "Quán cafe quen"
    default: 'Chưa xác định'
  },
  mood: { 
    type: String, // Ví dụ: 😊, 😢, 😍
    default: '😊' 
  },
  status: {
    type: String,
    default: 'Nháp', // Khi mới tạo sẽ là "Nháp"
    enum: ['Nháp', 'Hoàn thành'],
  },
  authorName: { 
    type: String, 
    required: [true, 'Vui lòng cho biết ai là người viết kỷ niệm này'],
    default: 'Ẩn danh',
    trim: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Memory', memorySchema);