#   Nginx入门指南

这份指南是对nginx的基本介绍，描述了用户借助nginx可以实现的一些简单任务。只支持运行在已经安装了nginx的读者机器上；如果没有安装，请参考Installing nginx 页面。

这份指南描述了怎样启动和停止nginx以及重新加载配置，说明了配置文件的结构以及如何启动nginx以输出静态内容，怎样设置代理服务器 和怎样连接FastCGI应用。

nginx有一个主进程和几个工作进程。主进程的主要目的是为了读取和评估配置并且维护工作进程。工作进程处理实际请求。nginx在工作进程中采用事件驱动模型和OS依赖机制有效分配请求。工作进程的数量取决于配置文件中定义的固定值或者是通过有效的CPU核数自动判定数量。工作进程的数量在配置文件中定义，可据给定的配置对工作进程的数量进行固定，也可以根据可用CPU内核的数量进行自动调整。(参看 worker_processes).

nginx及其各模块的工作方式取决于配置文件。默认情况下，配置文件名为nginx.conf，并放置在/usr/local/nginx/conf、/etc/nginx或/usr/local/etc/nginx.目录中。

## 启动, 停止, 和重新加载配置文件

启动的时候直接运行nginx.exe或者nginx。如果nginx已经启动，就可以直接使用参数-s 来进行调用执行，具体的使用语法如下：

```
nginx -s signal
```

signal 的位置可以是如下参数：

- stop —指令一经发出，直接停止
- quit — 等待所有的请求完成，再停止
- reload — 重新加载配置文件nginx.conf
- reopen —重新打开日志文件

例如,想要停止nginx进程，（等待当前所有的请求进程全部完成），可以使用如下命令：

```
nginx -s quit
```

注：此命令应在启动nginx的同一用户下执行。

reload或重启nginx，修改的配置文件才会被应用。为了重新加载配置，执行如下命令：

```
nginx -s reload
```

一旦主进程收到reload的信号，它就会检查新的配置文件语法，并且尝试应用这个新的配置文件。如果执行成功，主进程会启用一个新的工作进程，然后给原来工作进程发送一个信号，让它原来的工作进程停止。如果执行失败，主进程会回滚到原来的配置文件并继续使用原来的配置文件进行执行。原来的工作进程接收到停止命令之后，它会停止新的连接请求，但是当前已经建立的连接请求会等待其完成后终止。之后旧进程就会退出。

可以借助Unix工具（如kill实用程序）将信号发送到nginx进程。在这种情况下，信号直接发送到具有给定进程ID的进程。这个进程ID就是nginx的主进程标记，同时这个进程ID会被默认写入到文件夹/usr/local/nginx/logs或者/var/run下面。例如：如果主进程ID是1628，就发送指令QUIT来正常停止nginx，执行下面命令：

```
kill -s QUIT 1628
```

为了得到正在运行的ngixn进程列表，可以通过ps指令得到：

```
ps -ax | grep nginx
```

获取更多nginx信号信息，参考 Controlling nginx.

## 配置文件结构

nginx由模块组成，这些模块由配置文件中指定的指令控制。指令分为简单指令和块指令。一个简单的指令由名称和参数组成，这些名称和参数由空格分隔，并以分号(;)结尾。块指令具有与简单指令相同的结构，但它的结尾不是分号，而是一组由大括号({、})包围的附加指令。如果一个块指令在大括号中包含其他指令，则这个块指令又叫做上下文 (例如: events, http, server, 和location).

放在任何上下文之外的配置文件中的指令被认为是在主上下文 中。event和http指令驻留在主上下文中，server驻留在http中，location驻留在server中。

一行中在#符号后面的是注释

## 提供静态资源内容

web服务器最重要的任务是对外提供文件，例如(图片或者静态HTML网页)。示例：不同的请求会响应到不同的文件夹路径: /data/www(包含静态HTML文件) /data/images (包含图片)。此过程需要编辑配置文件，并在附有两个location块的http块中设置server块。参考：server指令 http指令 location 指令

首先，创建一个文件夹/data/www 把有内容的index.html 文件放到里面。并且创建/data/images文件夹，在里面放一些图片。

第二步，打开配置文件。默认的配置文件已经包含了几个server块指令，但是被注释了，现在把这些server块指令放开注释。

```
http {
  server {
  }
}
```

通常，配置文件包含几个server块指令，这些块指令通过不同的服务名字（server names）分发监听（distinguished listen）在不同的端口。一旦nginx决定哪个服务器处理请求，它就会根据server块指令中定义的location指令的参数匹配请求头中指定的URI。

在server块指令中添加location指令：

```
location / {
  root /data/www;
}
```

这个location块详述了与URI请求相匹配的“/”前缀。如果匹配到请求，这个 URI 会被转到 root 指令的路径。,也就是说，所有请求文件都会直接请求到本地文件系统的/data/www路径。如果有多个匹配的location块，nginx会选择最长前缀的那个。上面提供的location块是长度只有1的最短前缀，因此，其它所有的location块都匹配失败的话，这个location块指令才会被使用。

下一步，添加第二个location块：

```
location /images/ {
  root /data;
}
```

这个会匹配以/images开头的请求（/也会匹配请求，只不过这个前缀更短）。

server块指令配置结果如下：

```
server {
  location / {
    root /data/www;
  }
  location /images/ {
    root /data;
  }
}
```

一个正常的服务器配置文件监听在80端口上，并且可以在本机上成功访问http://localhost/。以/images/开头请求的URI地址，服务器会从/data/images文件夹下面返回对应的文件。例如，请求/data/images/example.png这个文件，nginx服务器会返回http://localhost/images/example.png。如果服务器没有这个文件会返回404 错误。不是以/images/开头的请求,就会被映射到/data/www 文件夹。例如, 请求nginx/data/www/some/example.html,服务器会响应http://localhost/some/example.html 这个文件。

为了应用一个新的配置文件，如果nginx还没有启动，就直接启动nginx服务器，如果已经启动，直接使用下面指令发送到nginx的主进程中，如下: 如果nginx尚未启动，则启动nginx，或者向nginx的主进程发送重新加载信号，执行:

```
nginx -s reload
```

一些情况下( `***`)，没有达到预期的效果，你可以尝试通过查看access.log和 error.log （通常在/usr/local/nginx/logs或者/var/log/nginx） 日志文件来找原因。

设置一个简单的代理服务器 使用最频繁的是设置一个代理服务器，也即接受请求，并把所有的请求转到被代理的服务器上，获取到响应之后再发送到客户端。

我们能配置一个基本的代理服务器，它的 ***图片文件请求和其它的全部请求都会被发送到代理服务器上。本例中,两个服务器定义在一个nginx实例。

首先，通过在配置文件中添加server块指令的方式来定义一个代理服务器。

```
server {
  listen 8080;
  root /data/up1;
  location / {}
}
```

这个简单的服务器会监听8080端口（之前, 由于使用了标准端口80，因此尚未指定listen指令）并且映射所有的请求到本地文件系统的/data/up1文件夹。创建这个文件夹并放一个文件index.html。需要注意的是 server上下文就是这个根指令的位置。例如 当选择用于提供请求的location块指令不包括根指令时，使用这样的根指令（root /data/up1）。

接下来，使用上一节中的服务器配置，并将其修改为代理服务器配置。在第一个位置块中，使用参数中指定的代理服务器的协议、名称和端口（在我们的示例中，它是[http://localhost:8080）放置proxy](http://localhost:8080）放置proxy_pass指令：

```
server {
  location / {
    proxy_pass http://localhost:8080;
  }
  location /images/ {
    root /data;
  }
}
```

我们修改第二个location指令块，这个指令块会把当前的/images前缀请求映射到/data/images文件夹中，为了匹配更多的图片类型请求，location块指令修改如下：

```
location ~ \.(gif|jpg|png)$ {
  root /data/images;
}
```

使用正则表达式~来匹配所有以 .gif, .jpg, 和.png结尾的URIs，响应的请求会被映射到/data/images文件夹中。

nginx在匹配location请求的时候，首先检查location 指令的特殊前缀，最长前缀()，最后检查正则。如果这个请求匹配到正则，ngixn会选中这个location,否则，会跳过找到最前的一个()。

代理服务器的配置结果看起来就是这样子：

```
server {
  location / {
    proxy_pass http://localhost:8080/;
  }
  location ~ \.(gif|jpg|png)$ {
    root /data/images;
  }
}
```

这个服务器将会过滤后缀为 .gif, .jpg, 或者 .png 的然后分发到/data/images文件夹(通过在root中添加URI参数) ，并且其它的请求会被代理到上面的server配置()中http://localhost:8080/。

为了使用最新的配置，就像前面一样，向nginx发送一个reload信号。

这里有更多的 more 指令可以使用在代理连接配置中。

启用 FastCGI 代理 nginx也能把请求路由到FastCGI服务上，它运行程序使用各种框架和编程语言（如PHP）。

使用FastCGI服务器的最基本的nginx配置包括使用fastcgipass 指令而不是proxypass指令，以及fastcgiparam指令来设置传递给FastCGI服务器的参数。假设FastCGI服务在localhost:9000可以访问，以上面一部分的配置为基础，替换proxypass指令为fastcgipass,并且修改参数为 localhost:9000。在PHP中, SCRIPTFILENAME参数为定义的脚本名称 QUERY_STRING参数为被请求的参数**，最终的配置如下：

```
server {
  location / {
    fastcgi_pass  localhost:9000;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_param QUERY_STRING    $query_string;
  }
  location ~ \.(gif|jpg|png)$ {
    root /data/images;
  }
}
```

这个服务器设置会路由所有除了静态图片的请求，通过FastCGI协议代理到localhost:9090代理服务器上。

