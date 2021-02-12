// Koa 中操作 cookie
const Koa = require("koa");
const Router = require("koa-router");

// 创建服务和路由
const app = new Koa();
const router = new Router();

// 签名需要设置 key
app.keys = ["shen"];

router.get("/read", (ctx, next) => {
    // 获取 cookie
    let name = ctx.cookies.get(name) || "No name";
    let name = ctx.cookies.get(age) || "No age";
    ctx.body = `${name}-${age}`;
});

router.get("/write", (ctx, next) => {
    // 设置 cookie
    ctx.cookies.set("name", "panda", { domain: "panda.com" });
    ctx.cookies.set("age", 28, { maxAge: 10 * 1000, signed: true });
});

// 使用路由
app.use(router.routes());
app.listen(3000);