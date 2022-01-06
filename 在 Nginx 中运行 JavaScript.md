# 在 Nginx 中运行 JavaScript

ginx 作为市场占有率最高的Web服务器，主打高性能、可扩展。自带了很多核心功能模块，并且也有大量的第三方模块。

Web 服务中灰度方案的实现，很多会采用 Nginx + Lua + Redis 方案。Lua 是一个轻量级的脚本语言，体积小、启动速度快、性能高。通过 `lua-nginx-module` 模块将 Lua 语言嵌入到 Nginx 中，可以使用 Lua 脚本扩展 Nginx 功能，并可以访问 MySQL、Redis 等数据库。

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/H8M5QJDxMHricNySWgnwOwWL1ZvKibS0z2ggIEjX6LELlE0ddYlLyDd6p6QhQfS8DZgFRa4waSVca714ccmVZHnA/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

Lua 虽然是个强大的脚本语言，但过于小众。Nginx 团队选择非常流行的 JavaScript 研发 NGINX JavaScript 模块 (njs)，让更多工程师可以使用 JavaScript 来扩展 Nginx 功能，从而更好的发展 Nginx 社区生态。

![图片](https://mmbiz.qpic.cn/sz_mmbiz_jpg/H8M5QJDxMHricNySWgnwOwWL1ZvKibS0z2nnibU8Sodibe5EedOxV4ZNiabGSsHFOOIhVVWmLLGribBMfMiaBEvzia0NWw/640?wx_fmt=jpeg&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

## NGINX JavaScript 简介

NGINX JavaScript 简称 njs，是 JavaScript 语言的子集，实现了部分 ECMAScript 5.1(strict mode)规范和 ECMAScript 6 规范，可以使用 njs 来扩展 Nginx 功能。

### njs 与 Node.js、JavaScript 的区别

一、运行时不同

Node.js 使用 V8 引擎，njs 是专门为 Nginx 定制设计的运行时。Node.js 使用 V8 引擎在内存中有一个持久化的 JavaScript 虚拟机 (VM) 并执行垃圾收集以进行内存管理；而 njs 是专门为 Nginx 设计，非常轻量，会为每个请求初始化一个新的 JavaScript VM 和必要的内存，并在请求完成时释放内存。

二、语言规范差异

JavaScript 的规范是由 ECMAScript 标准定义，随着标准版本的更新迭代，会支持更多的语言功能；njs 自研的服务端运行时，更多的优先支撑服务于 Nginx，只实现了 ECMAScript 5.1 和部分 ECMAScript 6，实现更多标准规范的同时，更多会考虑是否是 Nginx 所需要的。

## njs 安装&配置

安装 `nginx-module-njs` 动态模块，需要 Nginx 版本为 1.9.11 之后支持动态模块的载入。

```
yum install nginx-module-njs
```

安装后，在配置文件 nginx.conf 中需要使用 `load_module` 指令加载 njs 动态模块。

```
load_module modules/ngx_http_js_module.so;
```

## njs 基本使用

### Hello World

nginx.conf:

```
http {
    js_import http.js;
    # or js_import http from http.js;

    server {
        listen 8000;

        location / {
            js_content http.hello;
        }
    }
}
```

http.js:

```
function hello(r) {
    r.return(200, "Hello world!");
}

export default { hello };
```

`js_import` : 导入一个 njs 模块，没有指定模块名称则默认为文件名称。

`js_content` : 使用 njs 模块里导出的方法处理这个请求。

### HTTP Proxying

使用 njs 模块处理 HTTP 请求，并使用 `subrequest` 发起子请求。

nginx.conf:

```
js_import http.js;

location /start {
    js_content http.content;
}

location /foo {
    proxy_pass <http://backend1>;
}

location /bar {
    proxy_pass <http://backend2>;
}
```

http.js:

```
function content(r) {
    r.subrequest('/api/5/foo', {
          method: 'POST',
          body: JSON.stringify({ foo: 'foo', bar: "bar" })
    }, function(res) {
            if (res.status != 200) {
                r.return(res.status, res.responseBody);
                return;
            }
            var json = JSON.parse(res.responseBody);
            r.return(200, json.content);
    });
}

export default { content };
```

`r.subrequest` : 可以去请求内部的其他 API ，headers 和该请求相同，并且可以在 location 块里使用 `proxy_set_header` 来设置或覆盖原来的 header。

### 自定义日志输出格式

使用 njs 定制 Nginx 日志的输出格式。

nginx.js:

```
js_import  logging.js;
js_set     $access_log_headers logging.kvAccess;
log_format kvpairs $access_log_headers;

server {
    listen 80;
    root /usr/share/nginx/html;
    access_log /var/log/nginx/access.log kvpairs;
}
```

logging.js:

```
function kvAccess(r) {
    var log = `${r.variables.time_iso8601} client=${r.remoteAddress} method=${r.method} uri=${r.uri} status=${r.status}`;
    r.rawHeadersIn.forEach(h => log += ` in.${h[0]}=${h[1]}`);
    r.rawHeadersOut.forEach(h => log += ` out.${h[0]}=${h[1]}`);
    return log;
}

export default { kvAccess }
```

`js_set` : 将 njs 模块里的 `kvAccess` 方法执行后，执行结果放到 `$access_log_headers` 变量中。但如果只被引用在 `log_format` 中，则只会在日志记录阶段被执行。

`r` : HTTP request 对象。属性列表：http://nginx.org/en/docs/njs/reference.html#http

### 访问数据库

一、访问 Redis

使用 redis2-nginx-module 动态模块，结合 `subrequest` 来访问 Redis 数据。

nginx.conf:

```
js_import http.js;

# GET /redis_get?key=some_key
location = /redis_get {
     # 解码 uri 中的参数 key，赋值到变量 $key
     set_unescape_uri $key $arg_key;
     redis2_query get $key;
     redis2_pass 127.0.0.1:6379;
}

# GET /redis_set?key=one&val=first%20value
location = /redis_set {
     set_unescape_uri $key $arg_key;
     set_unescape_uri $val $arg_val;
     redis2_query set $key $val;
     redis2_pass 127.0.0.1:6379;
}

# GET /get_redis_data?key=some_key
location /get_redis_data {
    js_content http.get_redis_data;
}
```

http.js:

```
function serialize(obj) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    return str.join("&");
};

function get_redis_data(r) {
    r.subrequest('/redis_get', {
          args: serialize(r.args),
          method: 'GET'
    }, function(res) {
            if (res.status != 200) {
                r.return(res.status, res.responseBody);
                return;
            }

            r.return(200, res.responseBody);
    });
    return log;
}

export default { get_redis_data }
```

`set_unescape_uri` ：解码 uri 中参数的 %XX 编码。

`redis2_query` : 执行的 Redis 命令。

`redis2_pass` : Redis 后端服务。

> `redis2_pass` 返回值为类似 `redis-cli` 执行后的返回值，需要有一个 parser 来解析是否执行成。

二、访问 MySQL

使用 drizzle-nginx-module 动态模块，结合 `subrequest` 来访问 MySQL 数据。

nginx.conf:

```
upstream backend {
    drizzle_server 127.0.0.1:3306 dbname=test
        password=some_pass user=monty protocol=mysql;
}

server {
    js_import http.js;

    location /mysql {
         set_unescape_uri $name $arg_name;
         # 为防止 SQL 注入攻击，使用 set_quote_sql_str 来设置 sql 语句中的变量
         set_quote_sql_str $quoted_name $name;

         drizzle_query "select * from cats where name = $quoted_name";
         drizzle_pass backend;

         drizzle_connect_timeout    500ms; # default 60s
         drizzle_send_query_timeout 2s;    # default 60s
         drizzle_recv_cols_timeout  1s;    # default 60s
         drizzle_recv_rows_timeout  1s;    # default 60s
    }

    # GET /get_mysql_data?name=cat_name
    location /get_mysql_data {
        js_content http.get_mysql_data;
    }
}
```

http.js:

```
function serialize(obj) {
    var str = [];
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
    }
    return str.join("&");
};

function get_mysql_data(r) {
    r.subrequest('/mysql', {
          args: serialize(r.args),
          method: 'GET'
    }, function(res) {
            if (res.status != 200) {
                r.return(res.status, res.responseBody);
                return;
            }

            r.return(200, res.responseBody);
    });
    return log;
}

export default { get_mysql_data }
```

`set_quote_sql_str` : 为防止 SQL 注入攻击，来设置 sql 语句中的变量。

`drizzle_query` : 执行的 SQL 语句。

`drizzle_pass` : Drizzle 或 MySQL 服务的 upstream。

## 结语

在 njs 之前，Nginx+Lua 生态虽然已日趋成熟，但 Nginx 毕竟是一个 Web 服务器，JavaScript 作为 Web 开发的最流行的语言，可以使用 JavaScript 生态来扩展 Nginx 的功能，可能会更加的有一些想象力做更多的事情。