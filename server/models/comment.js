// server/models/comment.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 定义评论的数据结构
const CommentSchema = new Schema({
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true }, // 关联的文章ID
    author: { type: String, required: true }, // 评论作者
    authorEmail: { type: String }, // 作者邮箱
    content: { type: String, required: true }, // 评论内容
    publishDate: { type: Date, default: Date.now }, // 发布日期
    parentComment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null }, // 父评论ID (用于实现楼中楼回复)
    wpCommentId: { type: Number, unique: true }, // 从WordPress导入的旧ID
    wpParentId: { type: Number, default: 0 } // 从WordPress导入的父评论ID
});

module.exports = mongoose.model('Comment', CommentSchema);
