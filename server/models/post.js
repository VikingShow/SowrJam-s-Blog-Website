// server/models/post.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 定义文章的数据结构
const PostSchema = new Schema({
    title: { type: String, required: true }, // 标题
    content: { type: String, required: true }, // 内容 (HTML格式)
    author: { type: String, default: 'Sowr Jam' }, // 作者
    tags: [String], // 标签数组
    likes: { type: Number, default: 0 }, // 点赞数
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], // 关联的评论
    status: { type: String, enum: ['publish', 'draft'], default: 'publish' }, // 文章状态
    publishDate: { type: Date, default: Date.now }, // 发布日期
    wpPostId: { type: Number, unique: true } // 从WordPress导入的旧ID，用于关联评论
});

module.exports = mongoose.model('Post', PostSchema);
