// server/models/comment.js

const { DataTypes } = require('sequelize');

// **修改：将整个文件导出为一个函数，接收 sequelize 作为参数**
module.exports = (sequelize) => {
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

    return Comment;
};
