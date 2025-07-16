// server/server.js

// 1. 引入需要的模块
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 用于允许跨域请求

// 引入我们的数据模型
const Post = require('./models/post');
const Comment = require('./models/comment'); // 虽然暂时不用，但先引入

// 2. 初始化App
const app = express();
const PORT = 3000; // 服务器将运行在3000端口

// 3. 配置中间件
app.use(cors()); // 允许所有来源的请求，方便本地测试
app.use(express.json()); // 让服务器能解析JSON格式的请求体

// 4. 连接到MongoDB数据库
const MONGO_URI = 'mongodb://localhost:27017/my-new-blog';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ 数据库连接成功！'))
    .catch(err => console.error('数据库连接失败:', err));

// --- API 路由 ---

// 定义一个根路由，用于测试服务器是否正常运行
app.get('/', (req, res) => {
    res.send('欢迎来到我的博客后端API！');
});

// **核心API：获取所有文章列表**
app.get('/api/posts', async (req, res) => {
    try {
        // 从数据库中查找所有文章，并按发布日期倒序排列
        // .populate('comments') 会将文章中关联的评论ID，替换为完整的评论内容
        const posts = await Post.find({ status: 'publish' })
                                .sort({ publishDate: -1 })
                                .populate('comments'); 
        
        // 将查询到的文章以JSON格式返回给前端
        res.json(posts);
    } catch (error) {
        // 如果发生错误，返回500错误和错误信息
        res.status(500).json({ message: '获取文章列表失败', error: error });
    }
});

// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
});
