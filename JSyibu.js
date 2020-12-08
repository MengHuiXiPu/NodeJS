// ## 异步操作代码的变化
// 最后我们来感受一下，从一开始`callback`方式到后来的`async-await`方式，前前后后编写异步代码的变化。从变化中就可以体会到，确实越来越简洁，越来越易读。

// **`callback`方式**
fs.readFile('some1.json', (err, data) => {
    fs.readFile('some2.json', (err, data) => {
        fs.readFile('some3.json', (err, data) => {
            fs.readFile('some4.json', (err, data) => {

            })
        })
    })
})
// **`Promise`方式**

readFilePromise('some1.json').then(data => {
    return readFilePromise('some2.json')
}).then(data => {
    return readFilePromise('some3.json')
}).then(data => {
    return readFilePromise('some4.json')
})

// **`Generator`方式**
co(function* () {
    const r1 = yield readFilePromise('some1.json')
    const r2 = yield readFilePromise('some2.json')
    const r3 = yield readFilePromise('some3.json')
    const r4 = yield readFilePromise('some4.json')
})


// **`async-await`方式**
const readFileAsync = async function () {
    const f1 = await readFilePromise('data1.json')
    const f2 = await readFilePromise('data2.json')
    const f3 = await readFilePromise('data3.json')
    const f4 = await readFilePromise('data4.json')
}