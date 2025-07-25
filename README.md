# MyBlog - 一个全栈个人博客平台

这是一个从零开始构建的、功能完备的全栈个人博客系统。它采用了现代Web开发中主流的前后端分离架构，旨在提供一个高性能、高可维护性、高扩展性的个人内容发布平台。

## ✨ 功能亮点

### 前台 (读者端)
- **优雅的“蓝图”风格设计**，专注于提供沉浸式的阅读体验。
- **动态标题动画**，为网站注入独特的创意个性。
- **响应式布局**，完美适配桌面和移动设备。
- **卡片式文章列表**，自动提取封面图，视觉吸引力强。
- **标签云与分类筛选**，方便读者快速找到感兴趣的内容。
- **完善的文章详情页**，包含点赞、评论、标签展示等功能。
- **图片尺寸自适应**，确保文章内所有图片都以统一、优雅的方式展示。

### 后台 (管理端)
- **专业仪表盘设计**，与前台风格统一，提供高效的管理体验。
- **文章管理**：支持创建、编辑和删除文章（包括草稿）。
- **强大的Markdown编辑器 (EasyMDE)**：
    - 支持从本地直接上传 `.md` 文件。
    - 支持拖拽、粘贴或选择文件来**上传图片**。
- **强大的标签管理系统**：
    - 支持创建、重命名和删除标签。
    - 重命名或删除标签时，会自动同步更新所有关联的文章，确保数据一致性。
    - 在编辑文章时，提供**标签自动补全**功能。
- **优雅的交互逻辑**：所有操作均通过流畅的**模态框**完成，提供无刷新的即时反馈。

## 🛠️ 技术栈 (Tech Stack)

- **前端 (Client):**
  - `HTML5`
  - `CSS3` (原生CSS，无框架)
  - `JavaScript (ES6+)` (原生JS，无框架)

- **后端 (Server):**
  - `Node.js`: 运行时环境
  - `Express.js`: Web框架
  - `Sequelize`: ORM (对象关系映射)，用于操作数据库
  - `Multer`: 用于处理文件（图片）上传
  - `Marked`: 用于将Markdown转换为HTML

- **数据库 (Database):**
  - `MariaDB` (一个兼容MySQL的关系型数据库)

- **部署 (Deployment):**
  - `Nginx`: 作为反向代理和静态文件服务器
  - `Systemd`: 作为Node.js应用的进程守护管理器

## 🚀 本地安装与设置

1.  **克隆项目**
    ```bash
    git clone [你的仓库地址]
    cd myBlog
    ```

2.  **设置数据库**
    - 确保你本地已安装并运行MariaDB (或MySQL)。
    - 登录数据库并创建一个新的数据库和用户：
      ```sql
      CREATE DATABASE my_new_blog;
      CREATE USER 'blog_user'@'localhost' IDENTIFIED BY 'YOUR_PASSWORD';
      GRANT ALL PRIVILEGES ON my_new_blog.* TO 'blog_user'@'localhost';
      FLUSH PRIVILEGES;
      ```

3.  **配置后端**
    - 进入 `server` 目录: `cd server`
    - 复制 `database.js.example` (如果提供) 或直接编辑 `database.js`，填入你刚刚创建的数据库名、用户名和密码。

4.  **安装依赖**
    ```bash
    npm install
    ```

5.  **迁移数据 (可选)**
    - 如果你有从WordPress导出的 `.xml` 文件，请将其放在项目根目录。
    - 运行迁移脚本来初始化数据库并导入旧数据：
      ```bash
      node migrate.js
      ```

6.  **启动服务**
    - 启动后端API服务器：
      ```bash
      node server.js
      ```
    - 服务器将在 `http://localhost:3000` 运行。

7.  **访问网站**
    - 用浏览器直接打开 `client/index.html` (前台) 或 `client/admin/index.html` (后台)。