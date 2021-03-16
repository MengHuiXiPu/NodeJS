let express = require('express')
let app = express();

// 没有挂载路径的中间件，应用的每个请求都会执行该中间件
app.use(function (req, res, next) {
    console.log('Time:', Date.now());
    next();
});

// 挂载至 /user/:id 的中间件，任何指向 /user/:id 的请求都会执行它
app.use('/user/:id', function (req, res, next) {
    console.log('Request Type:', req.method);
    next();
});

// 路由和句柄函数(中间件系统)，处理指向 /user/:id 的 GET 请求
app.get('/user/:id', function (req, res, next) {
    res.send('USER');
});
// 可以看到express的中间件是使用next进行线性调用的，一个接着一个的执行，是一种尾递归的调用(后文会讲)。然后在最后一个中间件中进行对response的处理(习惯)