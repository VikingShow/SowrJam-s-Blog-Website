// server/models/post.js

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Post = sequelize.define('Post', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT('long'), // 使用长文本类型存储Markdown
        allowNull: false
    },
    tags: {
        type: DataTypes.JSON, // 使用JSON类型存储标签数组
        defaultValue: []
    },
    likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('publish', 'draft'),
        defaultValue: 'publish'
    },
    publishDate: {
        type: DataTypes.DATE
    },
    wpPostId: {
        type: DataTypes.INTEGER,
        unique: true
    }
});

module.exports = Post;
