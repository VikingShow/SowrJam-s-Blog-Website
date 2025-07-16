// server/migrate.js

console.log('--- 脚本开始执行 ---');

try {
    const fs = require('fs');
    console.log('[1/5] fs 模块加载成功。');

    const path = require('path');
    console.log('[2/5] path 模块加载成功。');

    const xml2js = require('xml2js');
    console.log('[3/5] xml2js 模块加载成功。');

    const mongoose = require('mongoose');
    console.log('[4/5] mongoose 模块加载成功。');

    // 引入我们刚刚创建的模型
    const Post = require('./models/post');
    const Comment = require('./models/comment');
    console.log('[5/5] 数据库模型加载成功。');

    // --- 配置区 ---
    const MONGO_URI = 'mongodb://localhost:27017/my-new-blog'; 
    const XML_FILE_PATH = path.join(__dirname, '..', 'sowrhome.WordPress.2025-07-16.xml'); 
    // --- 配置区结束 ---

    async function migrate() {
        let dbConnection;
        try {
            // 1. 连接数据库
            console.log('>>> 正在尝试连接到数据库...');
            dbConnection = await mongoose.connect(MONGO_URI);
            console.log('✅ 数据库连接成功！');

            // 清空旧数据
            await Post.deleteMany({});
            await Comment.deleteMany({});
            console.log('   - 旧的文章和评论数据已清空。');

            // 2. 读取并解析XML文件
            const xmlData = fs.readFileSync(XML_FILE_PATH, 'utf8');
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlData);
            console.log('   - XML文件解析成功。');

            const items = result.rss.channel[0].item;
            
            // 3. 筛选并迁移文章
            const postsToMigrate = items.filter(item => item['wp:post_type'][0] === 'post' && item['wp:status'][0] === 'publish');
            console.log(`>>> 发现 ${postsToMigrate.length} 篇已发布的文章需要迁移...`);

            for (const wpPost of postsToMigrate) {
                const tags = (wpPost.category || [])
                    .filter(c => c.$.domain === 'category')
                    .map(c => c._);

                const newPost = new Post({
                    title: wpPost.title[0],
                    content: wpPost['content:encoded'][0],
                    publishDate: new Date(wpPost.pubDate[0]),
                    status: wpPost['wp:status'][0],
                    tags: tags,
                    wpPostId: parseInt(wpPost['wp:post_id'][0])
                });
                await newPost.save();
            }
            console.log('✅ 所有文章迁移完成！');

            // 4. 筛选并迁移评论
            const commentsToMigrate = items.flatMap(item => 
                item['wp:comment'] ? 
                item['wp:comment'].map(c => ({ ...c, wpPostId: parseInt(item['wp:post_id'][0]) })) : 
                []
            );
            console.log(`>>> 发现 ${commentsToMigrate.length} 条评论需要迁移...`);

            for (const wpComment of commentsToMigrate) {
                // **--- 修改开始 ---**
                // 修正了所有wp:前缀的字段名，并使用括号表示法
                if (!wpComment['wp:comment_id'] || !wpComment['wp:comment_parent']) {
                    console.log('   - 跳过一条无效的评论记录（缺少ID）。');
                    continue;
                }
                // **--- 修改结束 ---**

                const relatedPost = await Post.findOne({ wpPostId: wpComment.wpPostId });
                if (!relatedPost) continue;

                // **--- 修改开始 ---**
                // 修正了所有wp:前缀的字段名
                const newComment = new Comment({
                    post: relatedPost._id,
                    author: wpComment['wp:comment_author'] ? wpComment['wp:comment_author'][0] : '匿名用户',
                    authorEmail: wpComment['wp:comment_author_email'] ? wpComment['wp:comment_author_email'][0] : '',
                    content: wpComment['wp:comment_content'] ? wpComment['wp:comment_content'][0] : '',
                    publishDate: wpComment['wp:comment_date_gmt'] ? new Date(wpComment['wp:comment_date_gmt'][0] + 'Z') : new Date(),
                    wpCommentId: parseInt(wpComment['wp:comment_id'][0]),
                    wpParentId: parseInt(wpComment['wp:comment_parent'][0])
                });
                // **--- 修改结束 ---**
                
                if (!newComment.content) {
                    continue;
                }

                const savedComment = await newComment.save();
                relatedPost.comments.push(savedComment._id);
                await relatedPost.save();
            }
            console.log('✅ 所有评论迁移完成！');

            // 5. 关联回复评论 (楼中楼)
            const allComments = await Comment.find({ wpParentId: { $ne: 0 } });
            for (const childComment of allComments) {
                const parentComment = await Comment.findOne({ wpCommentId: childComment.wpParentId });
                if (parentComment) {
                    childComment.parentComment = parentComment._id;
                    await childComment.save();
                }
            }
            console.log('✅ 评论回复关系已关联！');

        } catch (error) {
            console.error('迁移过程中发生错误:', error);
        } finally {
            // 6. 关闭数据库连接
            if (dbConnection) {
                await mongoose.connection.close();
                console.log('--- 数据库连接已关闭。迁移结束。 ---');
            } else {
                console.log('--- 脚本执行完毕（未连接到数据库）。 ---')
            }
        }
    }

    // 运行迁移函数
    console.log('>>> 准备调用迁移函数...');
    migrate();

} catch (error) {
    console.error('!!! 脚本在初始化时发生严重错误:', error);
    console.log('!!! 请检查是否已在server目录下运行 "npm install mongoose xml2js"');
}
