// server/models/comment.js

const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Post = require('./post');

const Comment = sequelize.define('Comment', {
    author: {
        type: DataTypes.STRING,
        allowNull: false
    },
    authorEmail: {
        type: DataTypes.STRING
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    publishDate: {
        type: DataTypes.DATE
    },
    wpCommentId: {
        type: DataTypes.INTEGER,
        unique: true
    },
    wpParentId: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

// 定义模型间的关系
Post.hasMany(Comment, { onDelete: 'CASCADE' }); // 如果文章删除，关联的评论也删除
Comment.belongsTo(Post);

Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentCommentId' });
Comment.belongsTo(Comment, { as: 'parentComment', foreignKey: 'parentCommentId' });


module.exports = Comment;
