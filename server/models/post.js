// server/models/post.js

const { DataTypes } = require('sequelize');

// **修改：将整个文件导出为一个函数，接收 sequelize 作为参数**
module.exports = (sequelize) => {
    const Post = sequelize.define('Post', {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT('long'), // 使用长文本类型存储Markdown
            allowNull: false
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
    return Post;
};
