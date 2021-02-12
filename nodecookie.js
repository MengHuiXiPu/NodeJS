// 原生中操作 cookie
const http = require("http");

// 创建服务
http.createServer((req, res) => {
    if (req.url === "/read") {
        // 读取 cookie
        console.log(req.headers.cookie);
        res.end(req.headers.cookie);
    } else if (req.url === "/write") {
        // 设置 cookie
        res.setHeader("Set-Cookie", [
            "name=panda; domain=panda.com; path=/write; httpOnly=true",
            `age=28; Expires=${new Date(Date.now() + 1000 * 10).toGMTString()}`,
            `address=${encodeURIComponent("回龙观")}; max-age=10`
        ]);
        res.end("Write ok");
    } else {
        res.end("Not Found");
    }
}).listen(3000);