// server/server.js

// 1. 引入需要的模块
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // 用于允许跨域请求

// 引入我们的数据模型
const Post = require('./models/post');
const Comment = require('./models/comment');

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

// **API 1：获取所有文章列表**
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

// **--- 新增API 2：获取单篇文章详情 ---**
app.get('/api/posts/:id', async (req, res) => {
    try {
        // 根据URL中的:id参数，查找特定的文章
        // 我们也populate评论，并且对评论的回复进行嵌套populate
        const post = await Post.findById(req.params.id)
                               .populate({
                                   path: 'comments',
                                   populate: { path: 'parentComment' } // 嵌套populate
                               });

        if (!post) {
            // 如果找不到文章，返回404错误
            return res.status(404).json({ message: '文章未找到' });
        }
        
        res.json(post);
    } catch (error) {
        res.status(500).json({ message: '获取单篇文章失败', error: error });
    }
});


// --- 启动服务器 ---
app.listen(PORT, () => {
    console.log(`🚀 服务器正在 http://localhost:${PORT} 上运行`);
});
