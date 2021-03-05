// 5. base64 转 file

const base64ConvertFile = function (urlData, filename) { // 64转file
  if (typeof urlData != 'string') {
    this.$toast("urlData不是字符串")
    return;
  }
  var arr = urlData.split(',')
  var type = arr[0].match(/:(.*?);/)[1]
  var fileExt = type.split('/')[1]
  var bstr = atob(arr[1])
  var n = bstr.length
  var u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], 'filename.' + fileExt, {
    type: type
  });
}